import 'server-only'
import { prisma } from '@/lib/db'
import { formatDateTime } from '@/lib/time'
import { LAGERORT_LABEL, haltbarkeitenAusSettings } from './storage'
import { ablaufAm, istLagerort, type Portion } from './portions'

export const VORRAT_REMINDER_KIND = 'vorrat'
/** So lange vorher meldet sich die App – genug Zeit, die Portion noch zu nutzen. */
export const VORWARNUNG_STUNDEN = 24

/**
 * Legt fuer jede vorraetige Portion eine Erinnerung 24 Stunden vor Ablauf an.
 *
 * Wie bei der Vorsorge werden die noch nicht verschickten Erinnerungen zuerst
 * geloescht und dann neu geschrieben – damit stimmt der Bestand nach jeder
 * Entnahme wieder. Abschaltbar ueber `milkExpiryPush`.
 */
export async function syncVorratErinnerungen(
  householdId: string,
  now: Date = new Date(),
): Promise<number> {
  await prisma.reminder.deleteMany({
    where: { householdId, kind: VORRAT_REMINDER_KIND, sentAt: null },
  })

  const [settings, portionen] = await Promise.all([
    prisma.householdSettings.findUnique({ where: { householdId } }),
    prisma.milkPortion.findMany({ where: { householdId, status: 'vorraetig' } }),
  ])

  if (settings && !settings.milkExpiryPush) return 0

  const haltbarkeiten = haltbarkeitenAusSettings(settings)
  const rows = portionen
    .map((portion) => {
      const ablauf = ablaufAm(portion as Portion, haltbarkeiten)
      return { portion, ablauf, dueAt: new Date(ablauf.getTime() - VORWARNUNG_STUNDEN * 3600_000) }
    })
    .filter((eintrag) => eintrag.dueAt.getTime() > now.getTime())
    .map(({ portion, ablauf, dueAt }) => ({
      householdId,
      childId: portion.childId,
      kind: VORRAT_REMINDER_KIND,
      title: `${portion.mengeMl} ml Muttermilch laufen morgen ab`,
      dueAt,
      payload: {
        body: `${
          istLagerort(portion.lagerort) ? LAGERORT_LABEL[portion.lagerort] : portion.lagerort
        } · haltbar bis ${formatDateTime(ablauf)}`,
        url: '/vorrat',
        portionId: portion.id,
      },
    }))

  if (rows.length === 0) return 0
  const created = await prisma.reminder.createMany({ data: rows })
  return created.count
}
