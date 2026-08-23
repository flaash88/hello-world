import { describe, expect, it } from 'vitest'
import {
  FULL_TRUST_SAMPLES,
  MIN_SAMPLES,
  buildWakeWindowModel,
  forecastNextSleep,
  measuredWakeWindows,
  sleepPressure,
  usualBedtimeMinutes,
  type SleepBlock,
} from './adaptive'
import { interpolatedWakeWindow } from './windows'

const NOW = new Date('2026-11-15T12:00:00Z')

/**
 * Erzeugt `count` Schlafbloecke mit festem Wachfenster und fester Schlafdauer,
 * rueckwaerts von NOW.
 */
function blocks(count: number, wakeMin: number, sleepMin = 60, from = NOW): SleepBlock[] {
  const cycle = (wakeMin + sleepMin) * 60000
  return Array.from({ length: count }, (_, i) => {
    const startedAt = new Date(from.getTime() - (count - i) * cycle)
    return { startedAt, endedAt: new Date(startedAt.getTime() + sleepMin * 60000), kind: 'nap' }
  })
}

describe('measuredWakeWindows', () => {
  it('misst die Luecke zwischen Schlafende und naechstem Schlafbeginn', () => {
    const measured = measuredWakeWindows(blocks(4, 90), 90)
    expect(measured).toHaveLength(3)
    for (const value of measured) expect(value).toBeCloseTo(90, 5)
  })

  it('ignoriert laufende Schlafphasen', () => {
    const list = [...blocks(3, 90), { startedAt: NOW, endedAt: null }]
    expect(measuredWakeWindows(list, 90)).toHaveLength(2)
  })

  it('verwirft zu kurze Wachphasen (kurz aufgewacht)', () => {
    const list: SleepBlock[] = [
      { startedAt: new Date('2026-11-15T08:00:00Z'), endedAt: new Date('2026-11-15T09:00:00Z') },
      // Nur 5 Minuten wach – das ist kein Wachfenster.
      { startedAt: new Date('2026-11-15T09:05:00Z'), endedAt: new Date('2026-11-15T10:00:00Z') },
    ]
    expect(measuredWakeWindows(list, 90)).toHaveLength(0)
  })

  it('verwirft absurd lange Luecken (vergessener Eintrag)', () => {
    const list: SleepBlock[] = [
      { startedAt: new Date('2026-11-15T00:00:00Z'), endedAt: new Date('2026-11-15T01:00:00Z') },
      { startedAt: new Date('2026-11-15T11:00:00Z'), endedAt: new Date('2026-11-15T12:00:00Z') },
    ]
    // 10 Stunden Luecke bei 90 Minuten Basis – klar ein fehlender Eintrag.
    expect(measuredWakeWindows(list, 90)).toHaveLength(0)
  })

  it('sortiert unsortierte Eingaben', () => {
    const sorted = blocks(4, 90)
    const shuffled = [sorted[2]!, sorted[0]!, sorted[3]!, sorted[1]!]
    expect(measuredWakeWindows(shuffled, 90)).toEqual(measuredWakeWindows(sorted, 90))
  })
})

describe('buildWakeWindowModel – Kalibrierung', () => {
  it('meldet ehrlich Kalibrierung, wenn es keine Daten gibt', () => {
    const model = buildWakeWindowModel(120, [], NOW)
    expect(model.calibrating).toBe(true)
    expect(model.sampleSize).toBe(0)
    expect(model.confidence).toBe(0)
    expect(model.expectedMin).toBe(interpolatedWakeWindow(120))
  })

  it('bleibt in Kalibrierung, solange zu wenige Messungen vorliegen', () => {
    const model = buildWakeWindowModel(120, blocks(MIN_SAMPLES, 100), NOW)
    // MIN_SAMPLES Bloecke ergeben MIN_SAMPLES-1 Messungen.
    expect(model.sampleSize).toBeLessThan(MIN_SAMPLES)
    expect(model.calibrating).toBe(true)
  })

  it('verlaesst die Kalibrierung ab genug Messungen', () => {
    const model = buildWakeWindowModel(120, blocks(MIN_SAMPLES + 2, 100), NOW)
    expect(model.calibrating).toBe(false)
    expect(model.sampleSize).toBeGreaterThanOrEqual(MIN_SAMPLES)
  })

  it('gibt in der Kalibrierung das breite Tabellenfenster aus', () => {
    const model = buildWakeWindowModel(120, [], NOW)
    expect(model.upperMin - model.lowerMin).toBeGreaterThan(30)
  })
})

describe('buildWakeWindowModel – Anpassung', () => {
  it('naehert sich mit mehr Daten dem gemessenen Median', () => {
    const table = interpolatedWakeWindow(120)
    const measuredValue = table + 60

    const few = buildWakeWindowModel(120, blocks(MIN_SAMPLES + 2, measuredValue), NOW)
    const many = buildWakeWindowModel(120, blocks(FULL_TRUST_SAMPLES + 5, measuredValue), NOW)

    expect(few.expectedMin).toBeGreaterThan(table)
    expect(few.expectedMin).toBeLessThan(measuredValue)
    expect(many.expectedMin).toBe(measuredValue)
    expect(many.adaptiveWeight).toBe(1)
  })

  it('folgt einem Kind mit kurzen Wachfenstern nach unten', () => {
    const table = interpolatedWakeWindow(120)
    const model = buildWakeWindowModel(120, blocks(20, 60), NOW)
    expect(model.expectedMin).toBe(60)
    expect(model.expectedMin).toBeLessThan(table)
  })

  it('laesst sich von einem einzelnen Ausreisser nicht verbiegen', () => {
    const normal = blocks(20, 100)
    // Ein einzelnes sehr langes Wachfenster mitten drin.
    const withOutlier: SleepBlock[] = [
      ...normal.slice(0, 10),
      {
        startedAt: new Date(normal[9]!.endedAt!.getTime() + 240 * 60000),
        endedAt: new Date(normal[9]!.endedAt!.getTime() + 300 * 60000),
      },
      ...normal.slice(10),
    ]
    const clean = buildWakeWindowModel(120, normal, NOW)
    const dirty = buildWakeWindowModel(120, withOutlier, NOW)
    expect(Math.abs(dirty.expectedMin - clean.expectedMin)).toBeLessThanOrEqual(5)
  })

  it('vergisst alte Daten ausserhalb des Beobachtungszeitraums', () => {
    const old = blocks(20, 200, 60, new Date(NOW.getTime() - 30 * 86400000))
    const model = buildWakeWindowModel(120, old, NOW)
    expect(model.calibrating).toBe(true)
    expect(model.sampleSize).toBe(0)
  })

  it('gibt bei gleichmaessigem Rhythmus hohe, bei chaotischem niedrige Konfidenz', () => {
    const steady = buildWakeWindowModel(120, blocks(20, 100), NOW)

    // Stark schwankende Wachfenster zwischen 40 und 160 Minuten.
    const chaotic: SleepBlock[] = []
    let cursor = NOW.getTime() - 20 * 4 * 3600_000
    for (let i = 0; i < 20; i++) {
      const wake = i % 2 === 0 ? 40 : 160
      const start = new Date(cursor + wake * 60000)
      const end = new Date(start.getTime() + 60 * 60000)
      chaotic.push({ startedAt: start, endedAt: end })
      cursor = end.getTime()
    }
    const noisy = buildWakeWindowModel(120, chaotic, NOW)

    expect(steady.confidence).toBeGreaterThan(0.8)
    expect(noisy.confidence).toBeLessThan(steady.confidence)
  })

  it('haelt das Fenster mindestens 20 Minuten breit', () => {
    const model = buildWakeWindowModel(120, blocks(20, 100), NOW)
    expect(model.upperMin - model.lowerMin).toBeGreaterThanOrEqual(20)
  })
})

describe('sleepPressure', () => {
  const model = buildWakeWindowModel(120, blocks(20, 100), NOW)

  it('liefert null ohne letztes Aufwachen', () => {
    expect(sleepPressure(null, model, NOW)).toBeNull()
  })

  it('stuft frisch, aufbauend, bereit und uebermuede ein', () => {
    const at = (minutesAgo: number) => new Date(NOW.getTime() - minutesAgo * 60000)
    expect(sleepPressure(at(10), model, NOW)!.level).toBe('fresh')
    expect(sleepPressure(at(70), model, NOW)!.level).toBe('building')
    expect(sleepPressure(at(95), model, NOW)!.level).toBe('ready')
    expect(sleepPressure(at(200), model, NOW)!.level).toBe('overtired')
  })

  it('rechnet das Verhaeltnis zum erwarteten Fenster', () => {
    const pressure = sleepPressure(new Date(NOW.getTime() - 50 * 60000), model, NOW)!
    expect(pressure.awakeMin).toBe(50)
    expect(pressure.ratio).toBeCloseTo(0.5, 1)
  })

  it('kann ueber 100 Prozent gehen', () => {
    const pressure = sleepPressure(new Date(NOW.getTime() - 300 * 60000), model, NOW)!
    expect(pressure.ratio).toBeGreaterThan(1)
  })
})

describe('forecastNextSleep', () => {
  const model = buildWakeWindowModel(120, blocks(20, 100), NOW)

  it('liefert null ohne letztes Aufwachen', () => {
    expect(forecastNextSleep(null, model, {}, NOW)).toBeNull()
  })

  it('legt das Fenster relativ zum letzten Aufwachen', () => {
    const wake = new Date(NOW.getTime() - 30 * 60000)
    const forecast = forecastNextSleep(wake, model, {}, NOW)!
    expect(forecast.from.getTime()).toBe(wake.getTime() + model.lowerMin * 60000)
    expect(forecast.to.getTime()).toBe(wake.getTime() + model.upperMin * 60000)
    expect(forecast.due).toBe(false)
  })

  it('markiert ein bereits laufendes Fenster als faellig', () => {
    const wake = new Date(NOW.getTime() - 200 * 60000)
    expect(forecastNextSleep(wake, model, {}, NOW)!.due).toBe(true)
  })

  it('erkennt das Fenster vor der ueblichen Bettzeit als Nacht', () => {
    // Aufwachen um 17:30 lokal, Bettzeit 19:00 -> Fenster liegt bei 19:00.
    const wake = new Date('2026-11-15T17:30:00Z')
    const nap = forecastNextSleep(wake, model, { bedtimeMinutes: 8 * 60 }, NOW)!
    const night = forecastNextSleep(wake, model, { bedtimeMinutes: 19 * 60 }, NOW)!
    expect(nap.kind).toBe('nap')
    expect(night.kind).toBe('bedtime')
  })

  it('reicht Konfidenz und Kalibrierung durch', () => {
    const calibrating = buildWakeWindowModel(120, [], NOW)
    const forecast = forecastNextSleep(new Date(NOW.getTime() - 30 * 60000), calibrating, {}, NOW)!
    expect(forecast.calibrating).toBe(true)
    expect(forecast.confidence).toBe(0)
  })
})

describe('usualBedtimeMinutes', () => {
  it('braucht mindestens drei Naechte', () => {
    expect(usualBedtimeMinutes([1200, 1210])).toBeNull()
  })

  it('bildet den Median der Bettzeiten', () => {
    expect(usualBedtimeMinutes([1200, 1230, 1215])).toBe(1215)
  })

  it('springt nicht, wenn Bettzeiten um Mitternacht streuen', () => {
    // 23:50, 00:10, 23:55 -> Median darf nicht mittags landen.
    const value = usualBedtimeMinutes([1430, 10, 1435])!
    expect(value === 1430 || value >= 1400 || value <= 60).toBe(true)
    expect(value).toBeGreaterThan(720)
  })
})
