'use server'
import { requireUser } from '@/lib/auth/session'
import { assertChildInHousehold } from '@/lib/household'
import { prisma } from '@/lib/db'
import { addDays, formatDateShort, minutesSinceLocalMidnight, startOfLocalDay } from '@/lib/time'
import { eventsBetween } from '@/lib/events/queries'
import { eventDetail, eventTitle } from '@/lib/events/format'
import { toDaySegments, type DaySegment } from '@/lib/dashboard/day-segments'
import { analyseSleep } from '@/lib/sleep/analysis'
import type { PlannedWindow } from '@/components/dashboard/day-clock'

export type DayClockData = {
  segments: DaySegment[]
  planned: PlannedWindow | null
  nowMinutes: number | null
  label: string
}

/**
 * Daten fuer die Kreisuhr eines bestimmten Tages. `dayOffset` ist 0 fuer heute
 * und negativ fuer Vortage.
 */
export async function loadDaySegmentsAction(
  childId: string,
  dayOffset: number,
): Promise<DayClockData> {
  const user = await requireUser()
  const child = await assertChildInHousehold(childId, user.householdId)
  const household = await prisma.household.findUniqueOrThrow({
    where: { id: user.householdId },
    select: { timezone: true },
  })
  return buildDayClockData(child.id, household.timezone, dayOffset)
}

export async function buildDayClockData(
  childId: string,
  timezone: string,
  dayOffset: number,
  now: Date = new Date(),
): Promise<DayClockData> {
  const dayStart = addDays(startOfLocalDay(now, timezone), Math.min(0, dayOffset), timezone)
  const dayEnd = addDays(dayStart, 1, timezone)

  const events = await eventsBetween(childId, dayStart, dayEnd)
  const segments = toDaySegments(events, dayStart, dayEnd, timezone, now, (event) => {
    const source = events.find((e) => e.id === event.id)!
    const detail = eventDetail(source)
    const title = eventTitle(source)
    return detail ? `${title} · ${detail}` : title
  })

  // Das geplante Fenster gibt es nur fuer heute – für Vortage wäre es sinnlos.
  let planned: PlannedWindow | null = null
  if (dayOffset === 0) {
    const child = await prisma.child.findUniqueOrThrow({ where: { id: childId } })
    const analysis = await analyseSleep(child, timezone, now)
    if (analysis.forecast && !analysis.forecast.calibrating) {
      planned = {
        fromMin: minutesSinceLocalMidnight(analysis.forecast.from, timezone),
        toMin: minutesSinceLocalMidnight(analysis.forecast.to, timezone),
        label:
          analysis.forecast.kind === 'bedtime'
            ? 'Geplantes Bettzeit-Fenster'
            : 'Geplantes Nickerchen-Fenster',
      }
      // Ein Fenster ueber Mitternacht wird am Tagesende abgeschnitten.
      if (planned.toMin < planned.fromMin) planned.toMin = 1440
    }
  }

  return {
    segments,
    planned,
    nowMinutes: dayOffset === 0 ? minutesSinceLocalMidnight(now, timezone) : null,
    label:
      dayOffset === 0
        ? 'Heute'
        : dayOffset === -1
          ? 'Gestern'
          : formatDateShort(dayStart, timezone),
  }
}
