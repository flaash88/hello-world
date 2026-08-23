'use server'
import { requireUser } from '@/lib/auth/session'
import { assertChildInHousehold } from '@/lib/household'
import { prisma } from '@/lib/db'
import { addDays, formatDateShort, minutesSinceLocalMidnight, startOfLocalDay } from '@/lib/time'
import { eventsBetween } from '@/lib/events/queries'
import { eventDetail, eventTitle } from '@/lib/events/format'
import { unitPrefsFrom, DEFAULT_UNITS, type UnitPrefs } from '@/lib/units'
import { toDaySegments, type DaySegment } from '@/lib/dashboard/day-segments'
import { analyseSleep } from '@/lib/sleep/analysis'
import { featureState } from '@/lib/settings/features'
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
    select: {
      timezone: true,
      settings: true,
      featureLevel: true,
      featureOverrides: true,
      featurePauseUntil: true,
    },
  })
  // Ist die Kreisuhr abgeschaltet, wird sie auch nicht nachgeladen.
  const features = featureState({
    level: household.featureLevel,
    overrides: household.featureOverrides,
    pauseUntil: household.featurePauseUntil,
  })
  if (!features.aktiv.has('kreisuhr')) {
    return { segments: [], planned: null, nowMinutes: null, label: '' }
  }
  return buildDayClockData(
    child.id,
    household.timezone,
    dayOffset,
    new Date(),
    unitPrefsFrom(household.settings),
    features.aktiv.has('schlafanalyse'),
  )
}

export async function buildDayClockData(
  childId: string,
  timezone: string,
  dayOffset: number,
  now: Date = new Date(),
  units: UnitPrefs = DEFAULT_UNITS,
  /**
   * Das erwartete Fenster gehoert zum Schlafrhythmus, nicht zur Uhr. Wer die
   * Uhr will, aber keine Vorhersage, bekommt die Uhr ohne Schattierung.
   */
  mitVorhersage = true,
): Promise<DayClockData> {
  const dayStart = addDays(startOfLocalDay(now, timezone), Math.min(0, dayOffset), timezone)
  const dayEnd = addDays(dayStart, 1, timezone)

  const events = await eventsBetween(childId, dayStart, dayEnd)
  const segments = toDaySegments(events, dayStart, dayEnd, timezone, now, (event) => {
    const source = events.find((e) => e.id === event.id)!
    const detail = eventDetail(source, units)
    const title = eventTitle(source)
    return detail ? `${title} · ${detail}` : title
  })

  // Das geplante Fenster gibt es nur fuer heute – für Vortage wäre es sinnlos.
  let planned: PlannedWindow | null = null
  if (dayOffset === 0 && mitVorhersage) {
    const child = await prisma.child.findUniqueOrThrow({ where: { id: childId } })
    const analysis = await analyseSleep(child, timezone, now)
    if (analysis.forecast && !analysis.forecast.calibrating) {
      planned = {
        fromMin: minutesSinceLocalMidnight(analysis.forecast.from, timezone),
        toMin: minutesSinceLocalMidnight(analysis.forecast.to, timezone),
        // Beobachtung, keine Planung: die Uhr zeigt, wann zuletzt Muedigkeit
        // kam, nicht wann etwas zu geschehen haette.
        label:
          analysis.forecast.kind === 'bedtime'
            ? 'Um diese Zeit ging es zuletzt in die Nacht'
            : 'Um diese Zeit kam zuletzt Müdigkeit',
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
