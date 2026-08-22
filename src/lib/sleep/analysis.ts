import 'server-only'
import type { Child, Event } from '@prisma/client'
import { prisma } from '@/lib/db'
import { addDays, ageInDays, minutesSinceLocalMidnight, startOfLocalDay } from '@/lib/time'
import { eventsBetween } from '@/lib/events/queries'
import {
  buildWakeWindowModel,
  forecastNextSleep,
  sleepPressure,
  usualBedtimeMinutes,
  LOOKBACK_DAYS,
  type SleepBlock,
  type SleepForecast,
  type SleepPressure,
  type WakeWindowModel,
} from './adaptive'
import { correctedAgeDays, wakeWindowFor } from './windows'

export type SleepAnalysis = {
  model: WakeWindowModel
  pressure: SleepPressure | null
  forecast: SleepForecast | null
  /** Ende des letzten abgeschlossenen Schlafs. */
  lastWakeAt: Date | null
  /** Laufender Schlaf, falls gerade geschlafen wird. */
  sleepingSince: Date | null
  /** Uebliche Bettzeit als Minuten seit lokal Mitternacht. */
  bedtimeMinutes: number | null
  /** Heutiger Schlaf in Minuten und das Tagesziel. */
  todaySleepMin: number
  targetSleepMin: number
  targetSleepMax: number
  todayNapCount: number
  targetNapsMin: number
  targetNapsMax: number
  ageDays: number
  correctedDays: number
}

function toBlocks(events: Event[]): SleepBlock[] {
  return events.map((event) => ({
    startedAt: event.startedAt,
    endedAt: event.endedAt,
    kind: (event.payload as { kind?: string } | null)?.kind,
  }))
}

/**
 * Wieviel Minuten eines Schlafblocks in das Fenster [from, to) fallen.
 * Ein Nachtschlaf zaehlt so anteilig zu beiden Kalendertagen.
 */
export function overlapMinutes(
  block: { startedAt: Date; endedAt: Date | null },
  from: Date,
  to: Date,
  now: Date = new Date(),
): number {
  const start = Math.max(block.startedAt.getTime(), from.getTime())
  const end = Math.min((block.endedAt ?? now).getTime(), to.getTime())
  return Math.max(0, (end - start) / 60000)
}

export async function analyseSleep(
  child: Child,
  timezone: string,
  now: Date = new Date(),
): Promise<SleepAnalysis> {
  const ageDays = child.birthDate ? ageInDays(child.birthDate, now, timezone) : 0
  const correctedDays = child.birthDate
    ? correctedAgeDays(ageDays, child.birthDate, child.dueDate)
    : 0
  const table = wakeWindowFor(correctedDays)

  const lookbackFrom = addDays(startOfLocalDay(now, timezone), -LOOKBACK_DAYS, timezone)
  const sleepEvents = await eventsBetween(child.id, lookbackFrom, now, ['sleep'])
  const blocks = toBlocks(sleepEvents)

  const model = buildWakeWindowModel(correctedDays, blocks, now)

  const running = sleepEvents.find((event) => event.endedAt === null)
  const finished = sleepEvents.filter((event) => event.endedAt !== null)
  const lastFinished = finished[finished.length - 1] ?? null

  // Bettzeiten der letzten Nächte für die Nap/Nacht-Unterscheidung.
  const nightStarts = sleepEvents
    .filter((event) => (event.payload as { kind?: string } | null)?.kind === 'night')
    .map((event) => minutesSinceLocalMidnight(event.startedAt, timezone))
  const bedtimeMinutes = usualBedtimeMinutes(nightStarts)

  const lastWakeAt = running ? null : (lastFinished?.endedAt ?? null)
  const timezoneOffsetMin = -new Date(now).getTimezoneOffset()

  const dayStart = startOfLocalDay(now, timezone)
  const dayEnd = addDays(dayStart, 1, timezone)
  const todaySleepMin = Math.round(
    sleepEvents.reduce((sum, event) => sum + overlapMinutes(event, dayStart, dayEnd, now), 0),
  )
  const todayNapCount = sleepEvents.filter(
    (event) =>
      (event.payload as { kind?: string } | null)?.kind !== 'night' &&
      event.startedAt >= dayStart &&
      event.startedAt < dayEnd,
  ).length

  return {
    model,
    pressure: sleepPressure(lastWakeAt, model, now),
    forecast: forecastNextSleep(lastWakeAt, model, { bedtimeMinutes, timezoneOffsetMin }, now),
    lastWakeAt,
    sleepingSince: running?.startedAt ?? null,
    bedtimeMinutes,
    todaySleepMin,
    targetSleepMin: table.totalSleepMin,
    targetSleepMax: table.totalSleepMax,
    todayNapCount,
    targetNapsMin: table.napsMin,
    targetNapsMax: table.napsMax,
    ageDays,
    correctedDays,
  }
}

/** Speichert die aktuelle Vorhersage – Grundlage fuer die Push-Erinnerung. */
export async function persistForecast(
  childId: string,
  forecast: SleepForecast | null,
  model: WakeWindowModel,
): Promise<void> {
  if (!forecast || forecast.calibrating) return

  const latest = await prisma.sleepPrediction.findFirst({
    where: { childId },
    orderBy: { computedAt: 'desc' },
  })
  // Nur schreiben, wenn sich das Fenster spuerbar verschoben hat.
  if (
    latest &&
    latest.kind === forecast.kind &&
    Math.abs(latest.windowFrom.getTime() - forecast.from.getTime()) < 5 * 60000
  ) {
    return
  }

  await prisma.sleepPrediction.create({
    data: {
      childId,
      kind: forecast.kind,
      windowFrom: forecast.from,
      windowTo: forecast.to,
      confidence: forecast.confidence,
      sampleSize: model.sampleSize,
      method: model.calibrating ? 'baseline' : 'adaptive',
    },
  })
}
