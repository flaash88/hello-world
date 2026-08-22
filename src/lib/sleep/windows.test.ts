import { describe, expect, it } from 'vitest'
import {
  WAKE_WINDOWS,
  correctedAgeDays,
  interpolatedWakeWindow,
  wakeWindowFor,
} from './windows'

describe('WAKE_WINDOWS', () => {
  it('ist nach Alter aufsteigend und lueckenlos', () => {
    for (let i = 1; i < WAKE_WINDOWS.length; i++) {
      expect(WAKE_WINDOWS[i]!.fromDays).toBeGreaterThan(WAKE_WINDOWS[i - 1]!.fromDays)
    }
    expect(WAKE_WINDOWS[0]!.fromDays).toBe(0)
  })

  it('hat plausible Bandbreiten', () => {
    for (const entry of WAKE_WINDOWS) {
      expect(entry.minMin).toBeLessThan(entry.typicalMin)
      expect(entry.maxMin).toBeGreaterThan(entry.typicalMin)
      expect(entry.totalSleepMin).toBeLessThan(entry.totalSleepMax)
      expect(entry.napsMin).toBeLessThanOrEqual(entry.napsMax)
    }
  })

  it('laesst Wachfenster mit dem Alter wachsen und Schlafbedarf sinken', () => {
    for (let i = 1; i < WAKE_WINDOWS.length; i++) {
      expect(WAKE_WINDOWS[i]!.typicalMin).toBeGreaterThan(WAKE_WINDOWS[i - 1]!.typicalMin)
      expect(WAKE_WINDOWS[i]!.totalSleepMax).toBeLessThanOrEqual(WAKE_WINDOWS[i - 1]!.totalSleepMax)
    }
  })
})

describe('wakeWindowFor', () => {
  it('waehlt den passenden Eintrag', () => {
    expect(wakeWindowFor(0).label).toBe('0–4 Wochen')
    expect(wakeWindowFor(27).label).toBe('0–4 Wochen')
    expect(wakeWindowFor(28).label).toBe('1–2 Monate')
    expect(wakeWindowFor(400).label).toBe('12–18 Monate')
    expect(wakeWindowFor(5000).label).toBe('ab 3 Jahren')
  })

  it('behandelt negatives Alter wie Tag 0', () => {
    expect(wakeWindowFor(-10).label).toBe('0–4 Wochen')
  })
})

describe('interpolatedWakeWindow', () => {
  it('trifft an den Stuetzstellen den Tabellenwert', () => {
    expect(interpolatedWakeWindow(0)).toBe(50)
    expect(interpolatedWakeWindow(28)).toBe(70)
    expect(interpolatedWakeWindow(182)).toBe(150)
  })

  it('interpoliert dazwischen und springt nicht', () => {
    const value = interpolatedWakeWindow(14)
    expect(value).toBeGreaterThan(50)
    expect(value).toBeLessThan(70)

    // Von Tag zu Tag darf sich der Wert nur wenig aendern.
    for (let day = 0; day < 700; day++) {
      const delta = Math.abs(interpolatedWakeWindow(day + 1) - interpolatedWakeWindow(day))
      expect(delta).toBeLessThanOrEqual(3)
    }
  })

  it('waechst monoton', () => {
    for (let day = 0; day < 1200; day++) {
      expect(interpolatedWakeWindow(day + 1)).toBeGreaterThanOrEqual(interpolatedWakeWindow(day))
    }
  })

  it('nutzt beim letzten Eintrag den Tabellenwert', () => {
    expect(interpolatedWakeWindow(2000)).toBe(390)
  })
})

describe('correctedAgeDays', () => {
  const birth = new Date('2026-08-01T00:00:00Z')

  it('laesst das Alter ohne ET unveraendert', () => {
    expect(correctedAgeDays(100, birth, null)).toBe(100)
  })

  it('korrigiert bei deutlicher Fruehgeburt', () => {
    const due = new Date('2026-09-15T00:00:00Z') // 45 Tage zu frueh
    expect(correctedAgeDays(100, birth, due)).toBe(55)
  })

  it('ignoriert Unterschiede unter zwei Wochen', () => {
    const due = new Date('2026-08-08T00:00:00Z')
    expect(correctedAgeDays(100, birth, due)).toBe(100)
  })

  it('korrigiert ab zwei Jahren nicht mehr', () => {
    const due = new Date('2026-09-15T00:00:00Z')
    expect(correctedAgeDays(800, birth, due)).toBe(800)
  })

  it('wird nie negativ', () => {
    const due = new Date('2026-10-01T00:00:00Z')
    expect(correctedAgeDays(10, birth, due)).toBe(0)
  })
})
