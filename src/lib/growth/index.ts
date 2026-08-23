/**
 * WHO-Wachstumsstandards: Perzentile und Kurven fuer ein Kind.
 *
 * Wichtig fuer die UI: Das ist eine Einordnung, keine medizinische Bewertung.
 * Ein Kind auf P5 ist genauso gesund wie eines auf P95, solange es der eigenen
 * Kurve folgt. Auffaellig ist der Verlauf, nicht der einzelne Punkt.
 */
import { lmsToZScore, lookupLms, percentileToZScore, zScoreToPercentile, zScoreToValue, type LmsTable } from './lms'

import wfaBoys from './data/weight-for-age-boys.json'
import wfaGirls from './data/weight-for-age-girls.json'
import lhfaBoys from './data/length-for-age-boys.json'
import lhfaGirls from './data/length-for-age-girls.json'
import hcfaBoys from './data/head-for-age-boys.json'
import hcfaGirls from './data/head-for-age-girls.json'
import bfaBoys from './data/bmi-for-age-boys.json'
import bfaGirls from './data/bmi-for-age-girls.json'

export type Indicator = 'weight' | 'length' | 'head' | 'bmi'
export type Sex = 'male' | 'female'

export const INDICATOR_LABEL: Record<Indicator, string> = {
  weight: 'Gewicht',
  length: 'Länge',
  head: 'Kopfumfang',
  bmi: 'BMI',
}

export const INDICATOR_UNIT: Record<Indicator, string> = {
  weight: 'kg',
  length: 'cm',
  head: 'cm',
  bmi: 'kg/m²',
}

const TABLES: Record<Indicator, Record<Sex, LmsTable>> = {
  weight: { male: wfaBoys as LmsTable, female: wfaGirls as LmsTable },
  length: { male: lhfaBoys as LmsTable, female: lhfaGirls as LmsTable },
  head: { male: hcfaBoys as LmsTable, female: hcfaGirls as LmsTable },
  bmi: { male: bfaBoys as LmsTable, female: bfaGirls as LmsTable },
}

/**
 * Ab dem 24. Lebensmonat misst die WHO nicht mehr die Liegelaenge, sondern die
 * Stehgroesse. Weil man im Liegen etwa 0,7 cm "groesser" ist, macht die
 * Referenzkurve an diesem Tag einen kleinen Sprung nach unten. Das ist kein
 * Fehler in den Daten – die UI weist an dieser Stelle darauf hin.
 */
export const LENGTH_HEIGHT_TRANSITION_DAY = 731

/** Die Kurven, die im Diagramm gezeichnet werden. */
export const CURVE_PERCENTILES = [3, 15, 50, 85, 97] as const

export type GrowthResult = {
  indicator: Indicator
  value: number
  ageDays: number
  zScore: number
  percentile: number
  /** Median (P50) fuer dieses Alter. */
  median: number
  /** true, wenn das Alter ausserhalb der WHO-Tabelle liegt (ueber 5 Jahre). */
  outOfRange: boolean
}

export function maxAgeDays(indicator: Indicator = 'weight', sex: Sex = 'female'): number {
  const table = TABLES[indicator][sex]
  return table.start + (table.lms.length - 1) * table.step
}

/** Perzentil und z-Wert einer einzelnen Messung. */
export function evaluateGrowth(
  indicator: Indicator,
  sex: Sex,
  value: number,
  ageDays: number,
): GrowthResult {
  const point = lookupLms(TABLES[indicator][sex], ageDays)
  const zScore = lmsToZScore(value, point)
  return {
    indicator,
    value,
    ageDays,
    zScore,
    percentile: zScoreToPercentile(zScore),
    median: point.m,
    outOfRange: point.clamped,
  }
}

export type CurvePoint = { ageDays: number } & Record<string, number>

/**
 * Stuetzstellen fuer die Perzentilkurven eines Altersbereichs.
 * `stepDays` steuert die Aufloesung – fuer die ersten Monate feiner.
 */
export function growthCurves(
  indicator: Indicator,
  sex: Sex,
  fromDays: number,
  toDays: number,
  stepDays?: number,
): CurvePoint[] {
  const table = TABLES[indicator][sex]
  const limit = maxAgeDays(indicator, sex)
  const from = Math.max(0, Math.floor(fromDays))
  const to = Math.min(limit, Math.ceil(toDays))
  // Rund 60 Stuetzstellen reichen fuer eine glatte Kurve.
  const step = stepDays ?? Math.max(1, Math.round((to - from) / 60))

  const points: CurvePoint[] = []
  for (let age = from; age <= to; age += step) {
    const lms = lookupLms(table, age)
    const point: CurvePoint = { ageDays: age }
    for (const percentile of CURVE_PERCENTILES) {
      point[`p${percentile}`] = zScoreToValue(percentileToZScore(percentile), lms)
    }
    points.push(point)
  }
  return points
}

/** BMI aus Gewicht und Laenge. */
export function bmiOf(weightKg: number, lengthCm: number): number | null {
  if (weightKg <= 0 || lengthCm <= 0) return null
  const meters = lengthCm / 100
  return weightKg / (meters * meters)
}

/**
 * Sprachliche Einordnung eines Perzentils. Bewusst wertfrei formuliert –
 * die App diagnostiziert nicht.
 */
export function describePercentile(percentile: number): string {
  if (!Number.isFinite(percentile)) return 'nicht berechenbar'
  const rounded = Math.round(percentile)
  if (rounded < 1) return 'unter dem 1. Perzentil'
  if (rounded > 99) return 'über dem 99. Perzentil'
  return `auf dem ${rounded}. Perzentil`
}

/** "P50" bzw. "< P3" fuer kompakte Anzeigen. */
export function shortPercentile(percentile: number): string {
  if (!Number.isFinite(percentile)) return '–'
  if (percentile < 3) return '< P3'
  if (percentile > 97) return '> P97'
  return `P${Math.round(percentile)}`
}
