/**
 * Bereitet die Eintraege eines Tages fuer die 24-Stunden-Kreisuhr auf.
 *
 * Ein Segment ist ein Bogen auf der Scheibe: Startminute und Endminute seit
 * lokal Mitternacht. Bloecke, die ueber Mitternacht gehen, werden am Tagesrand
 * abgeschnitten – der Rest gehoert zum Nachbartag.
 */
import { minutesSinceLocalMidnight } from '@/lib/time'
import type { EventType } from '@/lib/events/types'

export const MINUTES_PER_DAY = 1440

export type DaySegment = {
  id: string
  type: EventType | string
  /** Minuten seit lokal Mitternacht. */
  fromMin: number
  toMin: number
  /** Punkt-Events haben keine Dauer und werden als Marke gezeichnet. */
  isPoint: boolean
  running: boolean
  label: string
}

export type SegmentSource = {
  id: string
  type: string
  startedAt: Date
  endedAt: Date | null
  running: boolean
}

export function toDaySegments(
  events: readonly SegmentSource[],
  dayStart: Date,
  dayEnd: Date,
  timezone: string,
  now: Date = new Date(),
  labelOf: (event: SegmentSource) => string = (event) => event.type,
): DaySegment[] {
  const segments: DaySegment[] = []

  for (const event of events) {
    const start = event.startedAt.getTime()
    const rawEnd = (event.endedAt ?? (event.running ? now : event.startedAt)).getTime()

    // Ausserhalb des Tages liegende Anteile abschneiden.
    const clippedStart = Math.max(start, dayStart.getTime())
    const clippedEnd = Math.min(Math.max(rawEnd, start), dayEnd.getTime())
    if (clippedEnd < dayStart.getTime() || clippedStart > dayEnd.getTime()) continue

    const fromMin =
      clippedStart <= dayStart.getTime() ? 0 : minutesSinceLocalMidnight(new Date(clippedStart), timezone)
    const toMin =
      clippedEnd >= dayEnd.getTime()
        ? MINUTES_PER_DAY
        : minutesSinceLocalMidnight(new Date(clippedEnd), timezone)

    const isPoint = rawEnd - start < 60_000

    segments.push({
      id: event.id,
      type: event.type,
      fromMin,
      // Punkt-Events bekommen eine Mindestbreite, sonst sind sie unsichtbar.
      toMin: isPoint ? Math.min(MINUTES_PER_DAY, fromMin + 6) : Math.max(fromMin, toMin),
      isPoint,
      running: event.running,
      label: labelOf(event),
    })
  }

  return segments.sort((a, b) => a.fromMin - b.fromMin)
}

/** Punkt auf einem Kreis fuer eine Minute des Tages. Mitternacht ist oben. */
export function polarPoint(
  minute: number,
  radius: number,
  center: number,
): { x: number; y: number } {
  const angle = (minute / MINUTES_PER_DAY) * 2 * Math.PI - Math.PI / 2
  return { x: center + Math.cos(angle) * radius, y: center + Math.sin(angle) * radius }
}

/**
 * SVG-Pfad fuer einen Ringabschnitt zwischen zwei Minuten.
 * Ein voller Kreis wird als zwei Halbboegen gezeichnet, weil ein einzelner
 * Bogen mit identischem Start- und Endpunkt nichts zeichnet.
 */
export function arcPath(
  fromMin: number,
  toMin: number,
  innerRadius: number,
  outerRadius: number,
  center: number,
): string {
  const span = Math.max(0.5, Math.min(MINUTES_PER_DAY, toMin - fromMin))
  if (span >= MINUTES_PER_DAY) {
    return [
      arcPath(0, MINUTES_PER_DAY / 2, innerRadius, outerRadius, center),
      arcPath(MINUTES_PER_DAY / 2, MINUTES_PER_DAY, innerRadius, outerRadius, center),
    ].join(' ')
  }

  const end = fromMin + span
  const outerStart = polarPoint(fromMin, outerRadius, center)
  const outerEnd = polarPoint(end, outerRadius, center)
  const innerEnd = polarPoint(end, innerRadius, center)
  const innerStart = polarPoint(fromMin, innerRadius, center)
  const largeArc = span > MINUTES_PER_DAY / 2 ? 1 : 0

  return [
    `M ${outerStart.x.toFixed(2)} ${outerStart.y.toFixed(2)}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerEnd.x.toFixed(2)} ${outerEnd.y.toFixed(2)}`,
    `L ${innerEnd.x.toFixed(2)} ${innerEnd.y.toFixed(2)}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerStart.x.toFixed(2)} ${innerStart.y.toFixed(2)}`,
    'Z',
  ].join(' ')
}

/** "14:35" aus Minuten seit Mitternacht. */
export function minuteLabel(minute: number): string {
  const total = Math.round(minute) % MINUTES_PER_DAY
  const h = Math.floor(total / 60)
  const m = total % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}
