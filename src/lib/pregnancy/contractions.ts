/**
 * Auswertung des Wehen-Timers.
 *
 * Zwei Kenngroessen zaehlen: die Dauer einer Wehe und der Abstand zwischen
 * zwei Wehenbeginnen (nicht zwischen Ende und Beginn – so wird es in der
 * Geburtshilfe gezaehlt).
 *
 * Die 4-1-1-Regel ist der gaengige Anhaltspunkt fuer den Aufbruch in die
 * Klinik: Wehen alle 4 Minuten, je etwa 1 Minute lang, ueber 1 Stunde hinweg.
 * Sie ist eine Faustregel und ersetzt keine Hebamme.
 */
import { median } from '@/lib/utils'

export type ContractionInput = {
  startedAt: Date
  endedAt: Date | null
  intensity?: number | null
}

export type ContractionStats = {
  /** Anzahl abgeschlossener Wehen im Betrachtungsfenster. */
  count: number
  /** Median der Wehendauer in Sekunden; null bei zu wenig Daten. */
  medianDurationSec: number | null
  /** Median des Abstands von Beginn zu Beginn in Sekunden. */
  medianIntervalSec: number | null
  /** Kuerzester und laengster Abstand – zeigt, wie regelmaessig es ist. */
  minIntervalSec: number | null
  maxIntervalSec: number | null
  /** Streuung der Abstaende relativ zum Median (0 = perfekt regelmaessig). */
  regularity: number | null
  /** Zeitraum, ueber den die betrachteten Wehen verteilt sind. */
  spanSec: number
}

export type FourOneOneResult = {
  met: boolean
  /** Die drei Teilbedingungen einzeln – so sieht man, was noch fehlt. */
  intervalOk: boolean
  durationOk: boolean
  spanOk: boolean
  stats: ContractionStats
  /** Kurzer Satz fuer die UI. */
  summary: string
}

export const FOUR_ONE_ONE = {
  maxIntervalSec: 5 * 60, // "alle 4 Minuten" mit etwas Toleranz nach oben
  minDurationSec: 45, // "je eine Minute" mit Toleranz nach unten
  minSpanSec: 60 * 60, // "seit einer Stunde"
  minCount: 8, // in einer Stunde bei 4-Minuten-Abstand sind es rund 15
} as const

/** Wehen aus dem angegebenen Zeitfenster, neueste zuletzt. */
export function contractionsWithin(
  contractions: readonly ContractionInput[],
  windowSec: number,
  now: Date = new Date(),
): ContractionInput[] {
  const cutoff = now.getTime() - windowSec * 1000
  return contractions
    .filter((c) => c.startedAt.getTime() >= cutoff)
    .sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime())
}

export function contractionStats(contractions: readonly ContractionInput[]): ContractionStats {
  const sorted = [...contractions].sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime())
  const finished = sorted.filter((c) => c.endedAt !== null)

  const durations = finished.map((c) => (c.endedAt!.getTime() - c.startedAt.getTime()) / 1000)
  const intervals: number[] = []
  for (let i = 1; i < sorted.length; i++) {
    intervals.push((sorted[i]!.startedAt.getTime() - sorted[i - 1]!.startedAt.getTime()) / 1000)
  }

  const medianInterval = median(intervals)
  const spanSec =
    sorted.length >= 2
      ? (sorted[sorted.length - 1]!.startedAt.getTime() - sorted[0]!.startedAt.getTime()) / 1000
      : 0

  return {
    count: finished.length,
    medianDurationSec: median(durations),
    medianIntervalSec: medianInterval,
    minIntervalSec: intervals.length > 0 ? Math.min(...intervals) : null,
    maxIntervalSec: intervals.length > 0 ? Math.max(...intervals) : null,
    regularity:
      medianInterval && medianInterval > 0 && intervals.length >= 2
        ? Math.min(
            1,
            (Math.max(...intervals) - Math.min(...intervals)) / medianInterval,
          )
        : null,
    spanSec,
  }
}

export function evaluateFourOneOne(
  contractions: readonly ContractionInput[],
  now: Date = new Date(),
): FourOneOneResult {
  // Betrachtet wird die letzte Stunde plus etwas Vorlauf, damit der erste
  // Abstand innerhalb der Stunde ueberhaupt berechenbar ist.
  const window = contractionsWithin(contractions, 75 * 60, now)
  const stats = contractionStats(window)

  const intervalOk = stats.medianIntervalSec !== null && stats.medianIntervalSec <= FOUR_ONE_ONE.maxIntervalSec
  const durationOk = stats.medianDurationSec !== null && stats.medianDurationSec >= FOUR_ONE_ONE.minDurationSec
  const spanOk = stats.spanSec >= FOUR_ONE_ONE.minSpanSec && stats.count >= FOUR_ONE_ONE.minCount
  const met = intervalOk && durationOk && spanOk

  return { met, intervalOk, durationOk, spanOk, stats, summary: summarize({ met, intervalOk, durationOk, spanOk, stats }) }
}

function summarize(result: Omit<FourOneOneResult, 'summary'>): string {
  const { met, intervalOk, durationOk, spanOk, stats } = result

  if (stats.count === 0) return 'Noch keine abgeschlossene Wehe aufgezeichnet.'
  if (met) {
    return 'Das 4-1-1-Muster ist seit über einer Stunde erfüllt. Ruf bei deiner Hebamme oder in der Klinik an.'
  }
  const missing: string[] = []
  if (!intervalOk) missing.push('die Abstände sind noch länger als vier Minuten')
  if (!durationOk) missing.push('die Wehen dauern noch keine Minute')
  if (!spanOk) missing.push('das Muster hält noch keine volle Stunde an')
  return `Noch nicht im 4-1-1-Muster: ${missing.join(', ')}.`
}

/** Formatiert einen Abstand kompakt als "4:20 min". */
export function formatInterval(seconds: number | null): string {
  if (seconds === null) return '–'
  const total = Math.round(seconds)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')} min`
}
