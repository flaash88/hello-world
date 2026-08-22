import 'server-only'
import { prisma } from '@/lib/db'
import { addDays, startOfLocalDay } from '@/lib/time'
import { eventsBetween } from '@/lib/events/queries'
import { PERIOD_DAYS, type Period } from './periods'
import {
  dailySeries,
  diaperStats,
  feedingStats,
  sleepHeatmap,
  sleepStats,
  type StatEvent,
} from './aggregate'

export { PERIOD_DAYS, PERIOD_LABEL, type Period } from './periods'

export type StatsBundle = {
  from: Date
  to: Date
  period: Period
  sleep: ReturnType<typeof sleepStats>
  feeding: ReturnType<typeof feedingStats>
  diapers: ReturnType<typeof diaperStats>
  daily: ReturnType<typeof dailySeries>
  heatmap: ReturnType<typeof sleepHeatmap>
  eventCount: number
}

/**
 * Laedt alle Zahlen fuer einen Zeitraum in einem Rutsch. `offset` verschiebt
 * das Fenster nach hinten (0 = aktueller Zeitraum).
 */
export async function loadStats(
  childId: string,
  period: Period,
  timezone: string,
  offset = 0,
  now: Date = new Date(),
): Promise<StatsBundle> {
  const days = PERIOD_DAYS[period]
  const to = addDays(startOfLocalDay(now, timezone), 1 + offset * days, timezone)
  const from = addDays(to, -days, timezone)

  const events = await eventsBetween(childId, from, to)
  const stats: StatEvent[] = events.map((event) => ({
    id: event.id,
    type: event.type,
    startedAt: event.startedAt,
    endedAt: event.endedAt,
    durationSec: event.durationSec,
    payload: event.payload,
    running: event.running,
  }))

  return {
    from,
    to,
    period,
    sleep: sleepStats(stats, from, to, now),
    feeding: feedingStats(stats, from, to, timezone, now),
    diapers: diaperStats(stats, from, to),
    daily: dailySeries(stats, from, to, timezone, now),
    heatmap: [],
    eventCount: stats.filter((event) => event.startedAt >= from && event.startedAt < to).length,
  }
}

/** Schlaf-Heatmap ueber die letzten 30 Tage. */
export async function loadSleepHeatmap(
  childId: string,
  timezone: string,
  days = 30,
  now: Date = new Date(),
) {
  const to = addDays(startOfLocalDay(now, timezone), 1, timezone)
  const from = addDays(to, -days, timezone)
  const events = await eventsBetween(childId, from, to, ['sleep'])
  const stats: StatEvent[] = events.map((event) => ({
    id: event.id,
    type: event.type,
    startedAt: event.startedAt,
    endedAt: event.endedAt,
    durationSec: event.durationSec,
    payload: event.payload,
    running: event.running,
  }))
  return { from, to, cells: sleepHeatmap(stats, from, to, timezone, now) }
}

/** Wachstumsmessungen eines Kindes, aelteste zuerst. */
export async function loadMeasurements(childId: string) {
  return prisma.growthMeasurement.findMany({
    where: { childId },
    orderBy: { measuredAt: 'asc' },
  })
}
