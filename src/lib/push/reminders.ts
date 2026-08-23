import 'server-only'
import { prisma } from '@/lib/db'
import { formatTime } from '@/lib/time'
import { analyseSleep } from '@/lib/sleep/analysis'
import { syncVorsorgeReminders } from '@/lib/vorsorge/reminders'
import { syncVorratErinnerungen } from '@/lib/milk/reminders'
import { featureState } from '@/lib/settings/features'
import { kategorieFuerReminder } from './kategorien'
import { sendToHousehold, sendToUser } from './send'

export type ReminderRun = {
  sleepWindowAlerts: number
  dueReminders: number
  vorsorgeReminders: number
  errors: string[]
}

/**
 * Wird regelmaessig aufgerufen (Cron im Container oder systemd-Timer) und
 * verschickt, was faellig ist:
 *
 * 1. Schlaffenster-Vorwarnung X Minuten vor dem naechsten Fenster
 * 2. faellige Erinnerungen (Medikamente, Termine, eigene)
 * 3. Nachfuehren der Vorsorge-Erinnerungen, damit auch Fenster erfasst sind,
 *    die erst nach dem letzten Abhaken aufgegangen sind
 */
export async function runReminders(now: Date = new Date()): Promise<ReminderRun> {
  const result: ReminderRun = { sleepWindowAlerts: 0, dueReminders: 0, vorsorgeReminders: 0, errors: [] }

  await syncVorsorge(now, result)
  await sendSleepWindowAlerts(now, result)
  await sendDueReminders(now, result)

  return result
}

async function syncVorsorge(now: Date, result: ReminderRun): Promise<void> {
  const children = await prisma.child.findMany({
    where: { archived: false, birthDate: { not: null } },
    select: { id: true, householdId: true, birthDate: true, household: { select: { timezone: true } } },
  })

  for (const child of children) {
    try {
      result.vorsorgeReminders += await syncVorsorgeReminders(child, child.household.timezone, now)
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unbekannter Fehler')
    }
  }

  // Der Milchvorrat haengt am Haushalt, nicht am Kind.
  const households = await prisma.household.findMany({ select: { id: true } })
  for (const household of households) {
    try {
      await syncVorratErinnerungen(household.id, now)
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unbekannter Fehler')
    }
  }
}

async function sendSleepWindowAlerts(now: Date, result: ReminderRun): Promise<void> {
  const children = await prisma.child.findMany({
    where: { archived: false, birthDate: { not: null } },
    include: {
      household: {
        select: {
          id: true,
          timezone: true,
          featureLevel: true,
          featureOverrides: true,
          featurePauseUntil: true,
        },
      },
    },
  })

  for (const child of children) {
    try {
      // Ist der Schlafrhythmus abgeschaltet, wird er auch nicht gerechnet –
      // dann gibt es weder Vorhersage noch Hinweis darauf.
      const features = featureState(
        {
          level: child.household.featureLevel,
          overrides: child.household.featureOverrides,
          pauseUntil: child.household.featurePauseUntil,
        },
        now,
      )
      if (!features.aktiv.has('schlafanalyse')) continue

      const analysis = await analyseSleep(child, child.household.timezone, now)
      const forecast = analysis.forecast
      if (!forecast || forecast.calibrating || analysis.sleepingSince) continue

      const users = await prisma.user.findMany({
        where: { householdId: child.householdId },
        include: { notificationPrefs: true },
      })

      for (const user of users) {
        const prefs = user.notificationPrefs
        if (!prefs?.sleepWindowAlerts) continue

        const lead = prefs.napLeadMinutes
        const alertAt = forecast.from.getTime() - lead * 60000
        // Genau ein Durchlauf soll treffen: das Fenster ist so breit wie der
        // Aufrufabstand (5 Minuten) plus etwas Reserve.
        if (now.getTime() < alertAt || now.getTime() > alertAt + 6 * 60000) continue

        // Nicht zweimal fuer dasselbe Fenster warnen.
        const alreadySent = await prisma.reminder.findFirst({
          where: {
            householdId: child.householdId,
            userId: user.id,
            kind: 'nap',
            dueAt: forecast.from,
            sentAt: { not: null },
          },
        })
        if (alreadySent) continue

        await prisma.reminder.create({
          data: {
            householdId: child.householdId,
            childId: child.id,
            userId: user.id,
            kind: 'nap',
            title:
              forecast.kind === 'bedtime'
                ? 'Die Abendzeit rückt näher'
                : 'Das nächste Schlaffenster rückt näher',
            dueAt: forecast.from,
            sentAt: now,
            payload: { confidence: forecast.confidence },
          },
        })

        // Beschreibend, nicht auffordernd: kein "jetzt", kein Countdown, keine
        // Prozentzahl. Was daraus folgt, entscheiden die Eltern.
        await sendToUser(
          user.id,
          {
            title: `Bei ${child.name} könnte in etwa ${lead} Minuten Müdigkeit kommen`,
            body: `Zuletzt lag das Fenster ungefähr zwischen ${formatTime(
              forecast.from,
              child.household.timezone,
            )} und ${formatTime(forecast.to, child.household.timezone)}.`,
            url: '/',
            tag: `nap-${child.id}`,
          },
          'schlaffenster',
        )
        result.sleepWindowAlerts += 1
      }
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unbekannter Fehler')
    }
  }
}

async function sendDueReminders(now: Date, result: ReminderRun): Promise<void> {
  const due = await prisma.reminder.findMany({
    where: { sentAt: null, doneAt: null, dueAt: { lte: now }, kind: { not: 'nap' } },
    take: 50,
  })

  for (const reminder of due) {
    try {
      // Kennt die Erlaubnisliste die Art nicht, wird nichts verschickt – der
      // Eintrag gilt trotzdem als erledigt, sonst laeuft er ewig mit.
      const category = kategorieFuerReminder(reminder.kind)
      if (!category) {
        await prisma.reminder.update({ where: { id: reminder.id }, data: { sentAt: now } })
        continue
      }
      const payload = reminder.payload as { body?: string; url?: string } | null
      const message = {
        title: reminder.title,
        body: payload?.body ?? 'Steht jetzt an.',
        // Erinnerungen, die zu einer bestimmten Seite gehoeren, tragen ihr
        // Ziel in der Payload – sonst landet der Tap auf dem Dashboard.
        url: payload?.url ?? '/',
        tag: `reminder-${reminder.id}`,
      }

      if (reminder.userId) await sendToUser(reminder.userId, message, category)
      else await sendToHousehold(reminder.householdId, message, category)

      await prisma.reminder.update({ where: { id: reminder.id }, data: { sentAt: now } })

      // Wiederkehrende Erinnerungen (z. B. Medikament alle 6 Stunden).
      if (reminder.repeatEvery && reminder.repeatEvery > 0) {
        await prisma.reminder.create({
          data: {
            householdId: reminder.householdId,
            childId: reminder.childId,
            userId: reminder.userId,
            kind: reminder.kind,
            title: reminder.title,
            dueAt: new Date(reminder.dueAt.getTime() + reminder.repeatEvery * 60000),
            repeatEvery: reminder.repeatEvery,
            payload: reminder.payload ?? {},
          },
        })
      }
      result.dueReminders += 1
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unbekannter Fehler')
    }
  }
}
