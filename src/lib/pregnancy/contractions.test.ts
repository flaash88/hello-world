import { describe, expect, it } from 'vitest'
import {
  contractionStats,
  contractionsWithin,
  evaluateFourOneOne,
  formatInterval,
  type ContractionInput,
} from './contractions'

const NOW = new Date('2026-10-28T22:00:00Z')

/** Erzeugt `count` Wehen mit festem Abstand und fester Dauer, endend bei NOW. */
function series(count: number, intervalSec: number, durationSec: number): ContractionInput[] {
  return Array.from({ length: count }, (_, i) => {
    const startedAt = new Date(NOW.getTime() - (count - 1 - i) * intervalSec * 1000)
    return { startedAt, endedAt: new Date(startedAt.getTime() + durationSec * 1000) }
  })
}

describe('contractionStats', () => {
  it('berechnet Median von Dauer und Abstand', () => {
    const stats = contractionStats(series(5, 300, 60))
    expect(stats.count).toBe(5)
    expect(stats.medianDurationSec).toBe(60)
    expect(stats.medianIntervalSec).toBe(300)
    expect(stats.spanSec).toBe(1200)
  })

  it('misst den Abstand von Beginn zu Beginn, nicht von Ende zu Beginn', () => {
    const stats = contractionStats(series(3, 240, 90))
    expect(stats.medianIntervalSec).toBe(240)
  })

  it('kommt mit einer einzelnen Wehe zurecht', () => {
    const stats = contractionStats(series(1, 300, 50))
    expect(stats.medianIntervalSec).toBeNull()
    expect(stats.medianDurationSec).toBe(50)
    expect(stats.spanSec).toBe(0)
  })

  it('ignoriert laufende Wehen bei der Dauer', () => {
    const running: ContractionInput[] = [
      { startedAt: new Date(NOW.getTime() - 600_000), endedAt: new Date(NOW.getTime() - 540_000) },
      { startedAt: new Date(NOW.getTime() - 60_000), endedAt: null },
    ]
    const stats = contractionStats(running)
    expect(stats.count).toBe(1)
    expect(stats.medianDurationSec).toBe(60)
    expect(stats.medianIntervalSec).toBe(540)
  })

  it('bewertet die Regelmaessigkeit', () => {
    const regular = contractionStats(series(6, 300, 60))
    expect(regular.regularity).toBe(0)

    const irregular = contractionStats([
      { startedAt: new Date(NOW.getTime() - 3000_000), endedAt: new Date(NOW.getTime() - 2940_000) },
      { startedAt: new Date(NOW.getTime() - 1800_000), endedAt: new Date(NOW.getTime() - 1740_000) },
      { startedAt: new Date(NOW.getTime() - 1700_000), endedAt: new Date(NOW.getTime() - 1640_000) },
    ])
    expect(irregular.regularity).toBeGreaterThan(0.5)
  })
})

describe('contractionsWithin', () => {
  it('filtert auf das Zeitfenster und sortiert aufsteigend', () => {
    const old: ContractionInput = {
      startedAt: new Date(NOW.getTime() - 5 * 3600_000),
      endedAt: new Date(NOW.getTime() - 5 * 3600_000 + 60_000),
    }
    const list = [...series(3, 300, 60), old]
    const within = contractionsWithin(list, 3600, NOW)
    expect(within).toHaveLength(3)
    expect(within[0]!.startedAt.getTime()).toBeLessThan(within[1]!.startedAt.getTime())
  })
})

describe('evaluateFourOneOne', () => {
  it('erkennt ein erfuelltes 4-1-1-Muster', () => {
    // 16 Wehen alle 4 Minuten, je 60 Sekunden = 60 Minuten Spanne.
    const result = evaluateFourOneOne(series(16, 240, 60), NOW)
    expect(result.met).toBe(true)
    expect(result.intervalOk).toBe(true)
    expect(result.durationOk).toBe(true)
    expect(result.spanOk).toBe(true)
    expect(result.summary).toContain('Hebamme')
  })

  it('erkennt zu lange Abstaende', () => {
    const result = evaluateFourOneOne(series(9, 480, 60), NOW)
    expect(result.met).toBe(false)
    expect(result.intervalOk).toBe(false)
    expect(result.summary).toContain('vier Minuten')
  })

  it('erkennt zu kurze Wehen', () => {
    const result = evaluateFourOneOne(series(16, 240, 20), NOW)
    expect(result.met).toBe(false)
    expect(result.durationOk).toBe(false)
    expect(result.summary).toContain('keine Minute')
  })

  it('erkennt ein noch zu kurzes Muster', () => {
    // Nur 20 Minuten lang – Abstand und Dauer stimmen, die Stunde fehlt.
    const result = evaluateFourOneOne(series(6, 240, 60), NOW)
    expect(result.met).toBe(false)
    expect(result.spanOk).toBe(false)
    expect(result.summary).toContain('Stunde')
  })

  it('meldet ehrlich, wenn noch nichts da ist', () => {
    const result = evaluateFourOneOne([], NOW)
    expect(result.met).toBe(false)
    expect(result.summary).toContain('Noch keine')
  })

  it('ignoriert Wehen von vorgestern', () => {
    const yesterday = series(20, 240, 60).map((c) => ({
      startedAt: new Date(c.startedAt.getTime() - 86400_000),
      endedAt: new Date(c.endedAt!.getTime() - 86400_000),
    }))
    expect(evaluateFourOneOne(yesterday, NOW).met).toBe(false)
  })
})

describe('formatInterval', () => {
  it('formatiert Minuten und Sekunden', () => {
    expect(formatInterval(260)).toBe('4:20 min')
    expect(formatInterval(60)).toBe('1:00 min')
    expect(formatInterval(null)).toBe('–')
  })
})
