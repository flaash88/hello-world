import 'server-only'
import { prisma } from '@/lib/db'
import { loadImpfplan, loadUntersuchungen } from './load'
import { erinnerungenFor, impfEintraege, untersuchungsEintraege } from './status'

export const VORSORGE_REMINDER_KIND = 'vorsorge'

/**
 * Legt die Erinnerungen fuer alle offenen Vorsorgetermine eines Kindes an:
 * 14 Tage und 3 Tage vor Ende des jeweiligen Zeitfensters.
 *
 * Der Einfachheit halber werden die noch nicht verschickten Erinnerungen
 * zuerst geloescht und dann neu geschrieben. Damit stimmt der Bestand nach
 * jedem Abhaken wieder, ohne dass wir einzelne Zeilen nachfuehren muessen –
 * schon verschickte Erinnerungen bleiben als Beleg stehen.
 */
export async function syncVorsorgeReminders(
  child: { id: string; householdId: string; birthDate: Date | null },
  tz: string,
  now: Date = new Date(),
): Promise<number> {
  await prisma.reminder.deleteMany({
    where: { childId: child.id, kind: VORSORGE_REMINDER_KIND, sentAt: null },
  })
  if (!child.birthDate) return 0

  const [plan, untersuchungen, done] = await Promise.all([
    loadImpfplan(),
    loadUntersuchungen(),
    prisma.vorsorgeEntry.findMany({ where: { childId: child.id } }),
  ])

  const eintraege = [
    ...impfEintraege(plan.impfungen, child.birthDate, done, now, tz),
    ...untersuchungsEintraege(untersuchungen.kind, child.birthDate, done, now, tz),
  ]

  const rows = eintraege
    .filter((eintrag) => eintrag.status === 'faellig' || eintrag.status === 'offen')
    .flatMap((eintrag) =>
      erinnerungenFor(eintrag.fenster, now, tz).map((erinnerung) => ({
        householdId: child.householdId,
        childId: child.id,
        kind: VORSORGE_REMINDER_KIND,
        title:
          erinnerung.offsetDays === 3
            ? `${eintrag.titel}: Fenster endet in 3 Tagen`
            : `${eintrag.titel}: Fenster endet in 14 Tagen`,
        dueAt: erinnerung.dueAt,
        payload: {
          body: eintrag.statusText,
          url: '/vorsorge',
          templateKey: eintrag.key,
          vorsorgeKind: eintrag.kind,
          offsetDays: erinnerung.offsetDays,
        },
      })),
    )

  if (rows.length === 0) return 0
  const created = await prisma.reminder.createMany({ data: rows })
  return created.count
}
