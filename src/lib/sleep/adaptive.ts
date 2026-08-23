/**
 * Adaptives Wachfenster-Modell.
 *
 * Idee: Die Tabellenwerte in windows.ts sind nur der Startpunkt. Sobald genug
 * eigene Messungen vorliegen, gewinnt das, was das Kind tatsaechlich macht.
 *
 * Gemessen wird das Wachfenster als Zeit zwischen dem Ende eines Schlafs und
 * dem Beginn des naechsten. Robust gegen Ausreisser (Autofahrt, Arztbesuch,
 * vergessener Eintrag) durch gleitenden Median mit IQR-Filter statt Mittelwert.
 *
 * Solange zu wenige Messungen da sind, sagt das Modell das ehrlich: Es liefert
 * `calibrating: true` und ein bewusst breites Fenster, statt Genauigkeit
 * vorzutaeuschen, die es nicht gibt.
 */
import { median, quantile, withoutOutliers } from '@/lib/utils'
import { interpolatedWakeWindow, wakeWindowFor } from './windows'

/** Ab so vielen brauchbaren Messungen zaehlen die eigenen Daten mit. */
export const MIN_SAMPLES = 5
/** Ab so vielen Messungen zaehlen ausschliesslich die eigenen Daten. */
export const FULL_TRUST_SAMPLES = 15
/** Beobachtungszeitraum in Tagen. */
export const LOOKBACK_DAYS = 14
/** Kuerzere Wachphasen sind keine echten Wachfenster (kurz aufgewacht). */
export const MIN_VALID_WAKE_MIN = 10
/** Laengere Wachphasen sind fast immer ein vergessener Schlafeintrag. */
export const MAX_VALID_WAKE_FACTOR = 3

export type SleepBlock = {
  startedAt: Date
  endedAt: Date | null
  /** 'nap' oder 'night' aus der Payload. */
  kind?: string
}

export type WakeWindowModel = {
  /** Erwartetes Wachfenster in Minuten. */
  expectedMin: number
  /** Untere und obere Grenze des Vorhersagefensters in Minuten. */
  lowerMin: number
  upperMin: number
  /** Anzahl der verwendeten Messungen. */
  sampleSize: number
  /** 0..1 – wie sehr die eigenen Daten das Ergebnis bestimmen. */
  adaptiveWeight: number
  /** 0..1 – Konfidenz der Vorhersage. */
  confidence: number
  /** true, solange zu wenige Daten fuer eine ernsthafte Vorhersage da sind. */
  calibrating: boolean
  /** Der Tabellenwert zum Alter, zur Einordnung. */
  baselineMin: number
}

/**
 * Extrahiert die gemessenen Wachfenster (in Minuten) aus einer Liste von
 * Schlafbloecken. Erwartet aufsteigend sortierte, abgeschlossene Bloecke.
 */
export function measuredWakeWindows(
  blocks: readonly SleepBlock[],
  baselineMin: number,
): number[] {
  const finished = blocks
    .filter((b): b is SleepBlock & { endedAt: Date } => b.endedAt !== null)
    .sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime())

  const windows: number[] = []
  for (let i = 1; i < finished.length; i++) {
    const previousEnd = finished[i - 1]!.endedAt.getTime()
    const nextStart = finished[i]!.startedAt.getTime()
    const minutes = (nextStart - previousEnd) / 60000

    // Ueberlappende oder unsinnige Bloecke ueberspringen.
    if (minutes < MIN_VALID_WAKE_MIN) continue
    // Sehr lange Luecken sind vergessene Eintraege, keine Wachfenster.
    if (minutes > baselineMin * MAX_VALID_WAKE_FACTOR) continue
    windows.push(minutes)
  }
  return windows
}

/**
 * Baut das Modell aus Tabellenwert und eigenen Messungen.
 *
 * Die Gewichtung waechst linear zwischen MIN_SAMPLES und FULL_TRUST_SAMPLES –
 * so kippt die Vorhersage nicht schlagartig, wenn die fuenfte Messung kommt.
 */
export function buildWakeWindowModel(
  ageDays: number,
  blocks: readonly SleepBlock[],
  now: Date = new Date(),
): WakeWindowModel {
  const table = wakeWindowFor(ageDays)
  const baselineMin = interpolatedWakeWindow(ageDays)

  const cutoff = now.getTime() - LOOKBACK_DAYS * 86400000
  const recent = blocks.filter((b) => b.startedAt.getTime() >= cutoff)
  const measured = withoutOutliers(measuredWakeWindows(recent, baselineMin))
  const sampleSize = measured.length

  if (sampleSize < MIN_SAMPLES) {
    // Kalibrierung: Tabellenwert plus das breite Tabellenfenster.
    return {
      expectedMin: baselineMin,
      lowerMin: table.minMin,
      upperMin: table.maxMin,
      sampleSize,
      adaptiveWeight: 0,
      confidence: 0,
      calibrating: true,
      baselineMin,
    }
  }

  const measuredMedian = median(measured)!
  const weight = Math.min(
    1,
    (sampleSize - MIN_SAMPLES) / (FULL_TRUST_SAMPLES - MIN_SAMPLES),
  )
  const expectedMin = Math.round(baselineMin * (1 - weight) + measuredMedian * weight)

  // Das Fenster kommt aus der tatsaechlichen Streuung des Kindes (Quartile),
  // mindestens aber +/- 10 Minuten breit.
  const q1 = quantile(measured, 0.25)!
  const q3 = quantile(measured, 0.75)!
  const spread = Math.max(10, (q3 - q1) / 2)
  const lowerMin = Math.round(Math.max(MIN_VALID_WAKE_MIN, expectedMin - spread))
  const upperMin = Math.round(expectedMin + spread)

  // Konfidenz: viele Messungen und geringe Streuung ergeben hohe Konfidenz.
  const relativeSpread = expectedMin > 0 ? (q3 - q1) / expectedMin : 1
  const consistency = Math.max(0, 1 - relativeSpread)
  const confidence = Math.round(Math.min(1, weight * 0.5 + consistency * 0.5) * 100) / 100

  return {
    expectedMin,
    lowerMin,
    upperMin,
    sampleSize,
    adaptiveWeight: Math.round(weight * 100) / 100,
    confidence,
    calibrating: false,
    baselineMin,
  }
}

export type SleepPressure = {
  /** Minuten seit dem letzten Aufwachen. */
  awakeMin: number
  /** 0..1+, 1 = erwartetes Wachfenster erreicht. Kann ueber 1 gehen. */
  ratio: number
  /** Ampel fuer die UI. */
  level: 'fresh' | 'building' | 'ready' | 'overtired'
}

/** Schlafdruck seit dem letzten Aufwachen. */
export function sleepPressure(
  lastWakeAt: Date | null,
  model: WakeWindowModel,
  now: Date = new Date(),
): SleepPressure | null {
  if (!lastWakeAt) return null
  const awakeMin = Math.max(0, (now.getTime() - lastWakeAt.getTime()) / 60000)
  const ratio = model.expectedMin > 0 ? awakeMin / model.expectedMin : 0

  const level: SleepPressure['level'] =
    awakeMin >= model.upperMin
      ? 'overtired'
      : awakeMin >= model.lowerMin
        ? 'ready'
        : ratio >= 0.5
          ? 'building'
          : 'fresh'

  return { awakeMin: Math.round(awakeMin), ratio: Math.round(ratio * 100) / 100, level }
}

export type SleepForecast = {
  kind: 'nap' | 'bedtime'
  from: Date
  to: Date
  confidence: number
  calibrating: boolean
  sampleSize: number
  /** true, wenn das Fenster bereits laeuft oder vorbei ist. */
  due: boolean
}

/**
 * Naechstes Schlaffenster aus letztem Aufwachen und Modell.
 *
 * Ob es ein Nickerchen oder die Nacht wird, entscheidet die uebliche Bettzeit:
 * Faellt das Fenster in die zwei Stunden davor oder danach, ist es die Nacht.
 */
export function forecastNextSleep(
  lastWakeAt: Date | null,
  model: WakeWindowModel,
  options: { bedtimeMinutes?: number | null; timezoneOffsetMin?: number } = {},
  now: Date = new Date(),
): SleepForecast | null {
  if (!lastWakeAt) return null

  const from = new Date(lastWakeAt.getTime() + model.lowerMin * 60000)
  const to = new Date(lastWakeAt.getTime() + model.upperMin * 60000)

  const kind: 'nap' | 'bedtime' = isNearBedtime(from, options) ? 'bedtime' : 'nap'

  return {
    kind,
    from,
    to,
    confidence: model.confidence,
    calibrating: model.calibrating,
    sampleSize: model.sampleSize,
    due: now.getTime() >= from.getTime(),
  }
}

function isNearBedtime(
  at: Date,
  options: { bedtimeMinutes?: number | null; timezoneOffsetMin?: number },
): boolean {
  const bedtime = options.bedtimeMinutes
  if (bedtime === null || bedtime === undefined) return false
  const offset = options.timezoneOffsetMin ?? 0
  const localMinutes = ((at.getTime() / 60000 + offset) % 1440 + 1440) % 1440

  // Ein Fenster gilt als Bettzeit, wenn es hoechstens 90 Minuten vor der
  // ueblichen Bettzeit beginnt oder danach liegt (bis 3 Uhr frueh).
  const diff = localMinutes - bedtime
  const wrapped = diff < -720 ? diff + 1440 : diff > 720 ? diff - 1440 : diff
  return wrapped >= -90 && wrapped <= 360
}

/**
 * Uebliche Bettzeit als Minuten seit Mitternacht (Ortszeit), aus dem Median
 * der Nachtschlaf-Beginne. Null, solange zu wenige Naechte erfasst sind.
 */
export function usualBedtimeMinutes(
  nightStarts: readonly number[],
): number | null {
  if (nightStarts.length < 3) return null
  // Zeiten nach Mitternacht (0–360) werden auf 1440+ verschoben, damit der
  // Median nicht zwischen 23:50 und 00:10 in die Mittagszeit springt.
  const normalized = nightStarts.map((minutes) => (minutes < 360 ? minutes + 1440 : minutes))
  const value = median(normalized)!
  return Math.round(value) % 1440
}
