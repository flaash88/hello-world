import { describe, expect, it } from 'vitest'
import { LEAPS, activeLeap, nextLeap } from './leaps'

describe('LEAPS', () => {
  it('hat eindeutige, aufsteigende Fenster', () => {
    const ids = LEAPS.map((leap) => leap.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (let i = 1; i < LEAPS.length; i++) {
      expect(LEAPS[i]!.fromWeek).toBeGreaterThan(LEAPS[i - 1]!.toWeek)
    }
  })

  it('hat für jeden Sprung echten Inhalt', () => {
    for (const leap of LEAPS) {
      expect(leap.fromWeek).toBeLessThanOrEqual(leap.toWeek)
      expect(leap.theme.length).toBeGreaterThan(30)
      expect(leap.signs.length).toBeGreaterThanOrEqual(3)
      expect(leap.gains.length).toBeGreaterThanOrEqual(2)
      expect(leap.durationLabel.length).toBeGreaterThan(5)
    }
  })
})

describe('activeLeap', () => {
  it('findet den laufenden Sprung', () => {
    const result = activeLeap(4)
    expect(result?.leap.id).toBe(1)
    expect(result?.weeksIn).toBe(0)
  })

  it('liefert null zwischen zwei Sprüngen', () => {
    expect(activeLeap(6)).toBeNull()
    expect(activeLeap(30)).toBeNull()
  })

  it('berechnet den Fortschritt innerhalb des Fensters', () => {
    // Sprung 4 läuft von Woche 14 bis 19, also sechs Wochen.
    expect(activeLeap(14)?.progress).toBeCloseTo(1 / 6, 3)
    expect(activeLeap(19)?.progress).toBe(1)
  })

  it('liefert nach dem letzten Sprung null', () => {
    expect(activeLeap(200)).toBeNull()
  })
})

describe('nextLeap', () => {
  it('findet den nächsten Sprung mit Abstand', () => {
    const result = nextLeap(6)
    expect(result?.leap.id).toBe(2)
    expect(result?.weeksUntil).toBe(1)
  })

  it('liefert null, wenn alle Sprünge vorbei sind', () => {
    expect(nextLeap(200)).toBeNull()
  })

  it('überspringt den gerade laufenden Sprung', () => {
    expect(nextLeap(4)?.leap.id).toBe(2)
  })
})
