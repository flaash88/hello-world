import { describe, expect, it } from 'vitest'
import {
  SUPPORT_CONTACTS,
  SUPPORT_MIN_SAMPLES,
  evaluateSupportSignal,
  shouldSuppress,
  type ParentDay,
} from './support'

function day(overrides: Partial<ParentDay> = {}): ParentDay {
  return { date: '2026-11-15', mood: 4, energy: 3, stress: 2, sleepHours: 7, ...overrides }
}

describe('SUPPORT_CONTACTS', () => {
  it('enthält die österreichischen Anlaufstellen', () => {
    const phones = SUPPORT_CONTACTS.map((contact) => contact.phone).filter(Boolean)
    expect(phones).toContain('147')
    expect(phones).toContain('142')
    expect(phones).toContain('144')
  })

  it('beschreibt jede Anlaufstelle', () => {
    for (const contact of SUPPORT_CONTACTS) {
      expect(contact.name.length).toBeGreaterThan(3)
      expect(contact.description.length).toBeGreaterThan(30)
    }
  })
})

describe('evaluateSupportSignal', () => {
  it('meldet nichts bei zu wenigen Daten', () => {
    const result = evaluateSupportSignal([day(), day()])
    expect(result.show).toBe(false)
    expect(result.sampleSize).toBeLessThan(SUPPORT_MIN_SAMPLES)
  })

  it('meldet nichts bei guten Werten', () => {
    expect(evaluateSupportSignal(Array.from({ length: 14 }, () => day())).show).toBe(false)
  })

  it('meldet nichts nach einem einzelnen schlechten Tag', () => {
    const days = [...Array.from({ length: 13 }, () => day()), day({ mood: 1, stress: 5, sleepHours: 2 })]
    expect(evaluateSupportSignal(days).show).toBe(false)
  })

  it('meldet anhaltend niedrige Stimmung', () => {
    const days = [
      ...Array.from({ length: 5 }, () => day({ mood: 2 })),
      ...Array.from({ length: 5 }, () => day()),
    ]
    const result = evaluateSupportSignal(days)
    expect(result.show).toBe(true)
    expect(result.reason).toContain('Stimmung')
  })

  it('meldet anhaltenden Schlafmangel', () => {
    const days = [
      ...Array.from({ length: 5 }, () => day({ sleepHours: 4 })),
      ...Array.from({ length: 5 }, () => day()),
    ]
    const result = evaluateSupportSignal(days)
    expect(result.show).toBe(true)
    expect(result.reason).toContain('Schlaf')
  })

  it('meldet anhaltend hohe Belastung', () => {
    const days = [
      ...Array.from({ length: 6 }, () => day({ stress: 5 })),
      ...Array.from({ length: 4 }, () => day()),
    ]
    const result = evaluateSupportSignal(days)
    expect(result.show).toBe(true)
    expect(result.reason).toContain('Belastung')
  })

  it('formuliert wertfrei und ohne Diagnose', () => {
    const days = Array.from({ length: 10 }, () => day({ mood: 1 }))
    const reason = evaluateSupportSignal(days).reason!.toLowerCase()
    for (const word of ['depress', 'krank', 'störung', 'therapie', 'solltest']) {
      expect(reason).not.toContain(word)
    }
  })
})

describe('shouldSuppress', () => {
  const now = new Date('2026-11-15T12:00:00Z')

  it('zeigt den Hinweis, wenn er noch nie kam', () => {
    expect(shouldSuppress(null, now)).toBe(false)
  })

  it('unterdrückt ihn innerhalb einer Woche', () => {
    expect(shouldSuppress(new Date('2026-11-12T12:00:00Z'), now)).toBe(true)
  })

  it('lässt ihn nach einer Woche wieder zu', () => {
    expect(shouldSuppress(new Date('2026-11-01T12:00:00Z'), now)).toBe(false)
  })
})
