/**
 * Aggregationen fuer die Auswertungen. Bewusst als reine Funktionen ueber
 * bereits geladenen Events – so sind sie testbar und laufen auch im Export
 * ohne zweite Datenbankrunde.
 */
import { localDateKey, startOfLocalDay, addDays, zonedParts } from '@/lib/time'
import { groupBy, mean, median, sum } from '@/lib/utils'

export type StatEvent = {
  id: string
  type: string
  startedAt: Date
  endedAt: Date | null
  durationSec: number | null
  payload: unknown
  running: boolean
}

function payloadOf(event: StatEvent): Record<string, unknown> {
  return event.payload && typeof event.payload === 'object'
    ? (event.payload as Record<string, unknown>)
    : {}
}

function numberField(event: StatEvent, key: string): number | null {
  const value = payloadOf(event)[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

/** Effektive Dauer in Sekunden; laufende Timer bis jetzt. */
export function durationOf(event: StatEvent, now: Date = new Date()): number {
  if (event.durationSec !== null) return event.durationSec
  const end = event.endedAt ?? (event.running ? now : event.startedAt)
  return Math.max(0, (end.getTime() - event.startedAt.getTime()) / 1000)
}

/** Minuten eines Events, die in [from, to) fallen. */
export function overlapMinutes(
  event: StatEvent,
  from: Date,
  to: Date,
  now: Date = new Date(),
): number {
  const start = Math.max(event.startedAt.getTime(), from.getTime())
  const rawEnd = (event.endedAt ?? (event.running ? now : event.startedAt)).getTime()
  const end = Math.min(rawEnd, to.getTime())
  return Math.max(0, (end - start) / 60000)
}

// ------------------------------------------------------------------ Schlaf --

export type SleepStats = {
  /** Gesamtschlaf in Minuten. */
  totalMin: number
  /** Laengster zusammenhaengender Block in Minuten. */
  longestBlockMin: number
  /** Anzahl Schlafphasen. */
  blocks: number
  /** Nickerchen (alles ausser Nachtschlaf). */
  naps: number
  /** Nachtschlaf in Minuten. */
  nightMin: number
  /** Nachtwachen, summiert aus den Payloads. */
  wakeCount: number
  /** Durchschnittliche Einschlafdauer in Minuten. */
  avgFallAsleepMin: number | null
  /** Median der Wachfenster zwischen den Schlafphasen, in Minuten. */
  medianWakeWindowMin: number | null
}

export function sleepStats(
  events: readonly StatEvent[],
  from: Date,
  to: Date,
  now: Date = new Date(),
): SleepStats {
  const sleeps = events
    .filter((event) => event.type === 'sleep')
    .sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime())

  const totalMin = sum(sleeps.map((event) => overlapMinutes(event, from, to, now)))
  const nightMin = sum(
    sleeps
      .filter((event) => payloadOf(event).kind === 'night')
      .map((event) => overlapMinutes(event, from, to, now)),
  )

  const inRange = sleeps.filter(
    (event) => event.startedAt >= from && event.startedAt < to,
  )

  const fallAsleep = inRange
    .map((event) => numberField(event, 'fallAsleepSec'))
    .filter((value): value is number => value !== null)

  const wakeWindows: number[] = []
  for (let i = 1; i < sleeps.length; i++) {
    const previousEnd = sleeps[i - 1]!.endedAt
    if (!previousEnd) continue
    const minutes = (sleeps[i]!.startedAt.getTime() - previousEnd.getTime()) / 60000
    if (minutes >= 10 && minutes <= 12 * 60) wakeWindows.push(minutes)
  }

  return {
    totalMin: Math.round(totalMin),
    longestBlockMin: Math.round(
      Math.max(0, ...sleeps.map((event) => durationOf(event, now) / 60)),
    ),
    blocks: inRange.length,
    naps: inRange.filter((event) => payloadOf(event).kind !== 'night').length,
    nightMin: Math.round(nightMin),
    wakeCount: sum(inRange.map((event) => numberField(event, 'wakeCount') ?? 0)),
    avgFallAsleepMin: fallAsleep.length > 0 ? Math.round(mean(fallAsleep)! / 60) : null,
    medianWakeWindowMin: wakeWindows.length > 0 ? Math.round(median(wakeWindows)!) : null,
  }
}

// --------------------------------------------------------------- Fuetterung --

export type FeedingStats = {
  nursingCount: number
  nursingMin: number
  bottleCount: number
  bottleMl: number
  pumpingCount: number
  pumpingMl: number
  solidsCount: number
  /** Alle Mahlzeiten zusammen (Stillen, Flasche, Beikost). */
  mealCount: number
  /** Median des Abstands zwischen zwei Mahlzeiten, in Minuten. */
  medianIntervalMin: number | null
  /** Verteilung ueber den Tag in vier Bloecken. */
  byDaypart: { label: string; count: number }[]
}

const DAYPARTS = [
  { label: 'Nacht (0–6)', from: 0, to: 6 },
  { label: 'Vormittag (6–12)', from: 6, to: 12 },
  { label: 'Nachmittag (12–18)', from: 12, to: 18 },
  { label: 'Abend (18–24)', from: 18, to: 24 },
]

export function feedingStats(
  events: readonly StatEvent[],
  from: Date,
  to: Date,
  timezone: string,
  now: Date = new Date(),
): FeedingStats {
  const inRange = events.filter((event) => event.startedAt >= from && event.startedAt < to)
  const nursing = inRange.filter((event) => event.type === 'nursing')
  const bottle = inRange.filter((event) => event.type === 'bottle')
  const pumping = inRange.filter((event) => event.type === 'pumping')
  const solids = inRange.filter((event) => event.type === 'solids')

  const meals = [...nursing, ...bottle, ...solids].sort(
    (a, b) => a.startedAt.getTime() - b.startedAt.getTime(),
  )
  const intervals: number[] = []
  for (let i = 1; i < meals.length; i++) {
    intervals.push((meals[i]!.startedAt.getTime() - meals[i - 1]!.startedAt.getTime()) / 60000)
  }

  const byDaypart = DAYPARTS.map((part) => ({
    label: part.label,
    count: meals.filter((event) => {
      // Ueber zonedParts statt ueber format(): de-AT haengt " Uhr" an, was
      // beim direkten Parsen NaN ergibt.
      const { hour } = zonedParts(event.startedAt, timezone)
      return hour >= part.from && hour < part.to
    }).length,
  }))

  return {
    nursingCount: nursing.length,
    nursingMin: Math.round(sum(nursing.map((event) => durationOf(event, now) / 60))),
    bottleCount: bottle.length,
    bottleMl: Math.round(sum(bottle.map((event) => numberField(event, 'amountMl') ?? 0))),
    pumpingCount: pumping.length,
    pumpingMl: Math.round(
      sum(
        pumping.map(
          (event) =>
            numberField(event, 'amountMl') ??
            (numberField(event, 'leftMl') ?? 0) + (numberField(event, 'rightMl') ?? 0),
        ),
      ),
    ),
    solidsCount: solids.length,
    mealCount: meals.length,
    medianIntervalMin: intervals.length > 0 ? Math.round(median(intervals)!) : null,
    byDaypart,
  }
}

// ------------------------------------------------------------------ Windeln --

export type DiaperStats = {
  total: number
  wet: number
  dirty: number
  both: number
  /** Auffaellige Farben, die laut Beschreibung abgeklaert gehoeren. */
  notable: { color: string; count: number }[]
  perDay: number | null
}

export function diaperStats(
  events: readonly StatEvent[],
  from: Date,
  to: Date,
): DiaperStats {
  const diapers = events.filter(
    (event) => event.type === 'diaper' && event.startedAt >= from && event.startedAt < to,
  )
  const kindOf = (event: StatEvent) => payloadOf(event).kind

  const notableColors = ['red', 'white']
  const notable = notableColors
    .map((color) => ({
      color,
      count: diapers.filter((event) => payloadOf(event).color === color).length,
    }))
    .filter((entry) => entry.count > 0)

  const days = Math.max(1, (to.getTime() - from.getTime()) / 86400000)

  return {
    total: diapers.length,
    wet: diapers.filter((event) => kindOf(event) === 'wet').length,
    dirty: diapers.filter((event) => kindOf(event) === 'dirty').length,
    both: diapers.filter((event) => kindOf(event) === 'both').length,
    notable,
    perDay: diapers.length > 0 ? Math.round((diapers.length / days) * 10) / 10 : null,
  }
}

// ------------------------------------------------------ Tagesweise Reihen --

export type DailyPoint = {
  dayKey: string
  dayStart: Date
  sleepMin: number
  nightSleepMin: number
  naps: number
  feeds: number
  bottleMl: number
  diapers: number
}

/** Eine Zeile je lokalem Tag – Grundlage fuer Trendlinien und Heatmap. */
export function dailySeries(
  events: readonly StatEvent[],
  from: Date,
  to: Date,
  timezone: string,
  now: Date = new Date(),
): DailyPoint[] {
  const points: DailyPoint[] = []
  let cursor = startOfLocalDay(from, timezone)

  while (cursor.getTime() < to.getTime()) {
    const next = addDays(cursor, 1, timezone)
    const sleeps = events.filter((event) => event.type === 'sleep')

    points.push({
      dayKey: localDateKey(cursor, timezone),
      dayStart: cursor,
      sleepMin: Math.round(sum(sleeps.map((event) => overlapMinutes(event, cursor, next, now)))),
      nightSleepMin: Math.round(
        sum(
          sleeps
            .filter((event) => payloadOf(event).kind === 'night')
            .map((event) => overlapMinutes(event, cursor, next, now)),
        ),
      ),
      naps: sleeps.filter(
        (event) =>
          payloadOf(event).kind !== 'night' && event.startedAt >= cursor && event.startedAt < next,
      ).length,
      feeds: events.filter(
        (event) =>
          ['nursing', 'bottle', 'solids'].includes(event.type) &&
          event.startedAt >= cursor &&
          event.startedAt < next,
      ).length,
      bottleMl: Math.round(
        sum(
          events
            .filter(
              (event) =>
                event.type === 'bottle' && event.startedAt >= cursor && event.startedAt < next,
            )
            .map((event) => numberField(event, 'amountMl') ?? 0),
        ),
      ),
      diapers: events.filter(
        (event) =>
          event.type === 'diaper' && event.startedAt >= cursor && event.startedAt < next,
      ).length,
    })
    cursor = next
  }
  return points
}

export type HeatmapCell = { dayKey: string; hour: number; minutes: number }

/**
 * Schlaf-Heatmap: je Tag und Stunde die Anzahl Schlafminuten (0–60).
 * Zeile = Tag, Spalte = Uhrzeit.
 */
export function sleepHeatmap(
  events: readonly StatEvent[],
  from: Date,
  to: Date,
  timezone: string,
  now: Date = new Date(),
): HeatmapCell[] {
  const sleeps = events.filter((event) => event.type === 'sleep')
  const cells: HeatmapCell[] = []
  let cursor = startOfLocalDay(from, timezone)

  while (cursor.getTime() < to.getTime()) {
    const dayKey = localDateKey(cursor, timezone)
    const nextDay = addDays(cursor, 1, timezone)
    // Stundengrenzen aus dem Tagesbeginn ableiten – so bleiben sie auch an
    // Zeitumstellungstagen konsistent mit der lokalen Uhr.
    const dayLengthMs = nextDay.getTime() - cursor.getTime()
    const hours = Math.round(dayLengthMs / 3600000)

    for (let hour = 0; hour < hours; hour++) {
      const hourStart = new Date(cursor.getTime() + hour * 3600000)
      const hourEnd = new Date(Math.min(hourStart.getTime() + 3600000, nextDay.getTime()))
      const minutes = sum(sleeps.map((event) => overlapMinutes(event, hourStart, hourEnd, now)))
      if (minutes > 0) cells.push({ dayKey, hour, minutes: Math.round(minutes) })
    }
    cursor = nextDay
  }
  return cells
}

/** Zaehlt Eintraege je Typ – fuer die Uebersichtskacheln. */
export function countByType(events: readonly StatEvent[]): Map<string, number> {
  const grouped = groupBy(events, (event) => event.type)
  return new Map([...grouped.entries()].map(([type, list]) => [type, list.length]))
}
