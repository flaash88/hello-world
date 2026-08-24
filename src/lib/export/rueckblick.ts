import 'server-only'
import { prisma } from '@/lib/db'
import { addDays, startOfLocalDay } from '@/lib/time'

/**
 * Was in einem Jahr zusammengekommen ist. Einmal geladen, von der Seite und
 * vom PDF benutzt – sonst zeigt der Ausdruck irgendwann etwas anderes als der
 * Bildschirm.
 */

/** So viele Fotos je Eintrag zeigt der Rückblick. */
export const FOTOS_PRO_EINTRAG = 3

export async function ladeRueckblick(opts: {
  childId: string
  jahr: number
  timezone: string
}) {
  const { childId, jahr, timezone: tz } = opts
  // Mittags gerechnet, damit die Zeitzonenverschiebung nicht ins Vorjahr rutscht.
  const von = startOfLocalDay(new Date(Date.UTC(jahr, 0, 1, 12)), tz)
  const bis = addDays(startOfLocalDay(new Date(Date.UTC(jahr + 1, 0, 1, 12)), tz), 0, tz)

  const [eintraege, meilensteine, messungen, toene] = await Promise.all([
    prisma.journalEntry.findMany({
      where: { childId, happenedAt: { gte: von, lt: bis } },
      include: { media: { take: FOTOS_PRO_EINTRAG } },
      orderBy: { happenedAt: 'asc' },
    }),
    prisma.milestone.findMany({
      where: { childId, achievedAt: { gte: von, lt: bis } },
      orderBy: { achievedAt: 'asc' },
    }),
    prisma.growthMeasurement.findMany({
      where: { childId, measuredAt: { gte: von, lt: bis } },
      orderBy: { measuredAt: 'asc' },
    }),
    prisma.audioNote.findMany({
      where: { childId, recordedAt: { gte: von, lt: bis } },
      orderBy: { recordedAt: 'asc' },
      select: { id: true, title: true, recordedAt: true, durationSec: true },
    }),
  ])

  return { von, bis, eintraege, meilensteine, messungen, toene }
}

export type Rueckblick = Awaited<ReturnType<typeof ladeRueckblick>>
