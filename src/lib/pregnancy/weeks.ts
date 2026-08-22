/**
 * Schwangerschaftsrechnung.
 *
 * Konvention (wie im Mutter-Kind-Pass): Die Schwangerschaftswoche wird ab dem
 * ersten Tag der letzten Periode gezaehlt. Der errechnete Termin (ET) liegt
 * 280 Tage (40+0) danach. Aus dem ET laesst sich damit jederzeit auf das
 * Schwangerschaftsalter zurueckrechnen – auch wenn die letzte Periode nicht
 * bekannt ist oder der ET per Ultraschall korrigiert wurde.
 *
 * Geschrieben wird "SSW 24+3": abgeschlossene Wochen + zusaetzliche Tage.
 */
import { daysBetween, startOfLocalDay, addDays, APP_TIMEZONE } from '@/lib/time'
import { clamp } from '@/lib/utils'

export const GESTATION_DAYS = 280
export const MAX_TRACKED_WEEK = 42

export type GestationalAge = {
  /** Abgeschlossene Wochen seit dem 1. Tag der letzten Periode (0–42+). */
  week: number
  /** Zusaetzliche Tage in der laufenden Woche (0–6). */
  day: number
  /** Gesamttage seit dem 1. Tag der letzten Periode. */
  totalDays: number
  /** Tage bis zum errechneten Termin (negativ, wenn er ueberschritten ist). */
  daysToDue: number
  /** 1, 2 oder 3. */
  trimester: 1 | 2 | 3
  /** Fortschritt 0..1, gedeckelt bei 1. */
  progress: number
  /** "24+3" */
  label: string
  /** true, sobald der ET ueberschritten ist. */
  overdue: boolean
}

/** Errechneter Termin aus dem ersten Tag der letzten Periode (Naegele). */
export function dueDateFromLastPeriod(lastPeriod: Date, tz: string = APP_TIMEZONE): Date {
  return addDays(startOfLocalDay(lastPeriod, tz), GESTATION_DAYS, tz)
}

/** Erster Tag der letzten Periode aus dem errechneten Termin. */
export function lastPeriodFromDueDate(dueDate: Date, tz: string = APP_TIMEZONE): Date {
  return addDays(startOfLocalDay(dueDate, tz), -GESTATION_DAYS, tz)
}

export function gestationalAge(
  dueDate: Date,
  at: Date = new Date(),
  tz: string = APP_TIMEZONE,
): GestationalAge {
  const start = lastPeriodFromDueDate(dueDate, tz)
  const totalDays = daysBetween(start, at, tz)
  const daysToDue = daysBetween(at, dueDate, tz)
  const week = Math.max(0, Math.floor(totalDays / 7))
  const day = Math.max(0, totalDays % 7)

  // Trimester nach der gaengigen Einteilung: 1. bis 13+6, 2. bis 27+6, dann 3.
  const trimester: 1 | 2 | 3 = week < 14 ? 1 : week < 28 ? 2 : 3

  return {
    week,
    day,
    totalDays,
    daysToDue,
    trimester,
    progress: clamp(totalDays / GESTATION_DAYS, 0, 1),
    label: `${week}+${day}`,
    overdue: daysToDue < 0,
  }
}

/** Beginn (Montag 0:00 Ortszeit) der angegebenen SSW. */
export function startOfGestationalWeek(
  dueDate: Date,
  week: number,
  tz: string = APP_TIMEZONE,
): Date {
  return addDays(lastPeriodFromDueDate(dueDate, tz), week * 7, tz)
}

export type TrimesterInfo = { number: 1 | 2 | 3; label: string; fromWeek: number; toWeek: number }

export const TRIMESTERS: TrimesterInfo[] = [
  { number: 1, label: '1. Trimester', fromWeek: 0, toWeek: 13 },
  { number: 2, label: '2. Trimester', fromWeek: 14, toWeek: 27 },
  { number: 3, label: '3. Trimester', fromWeek: 28, toWeek: 42 },
]
