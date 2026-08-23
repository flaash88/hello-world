import { describe, expect, it } from 'vitest'
import {
  SHORTCUT_ACTIONS,
  SHORTCUT_PARAM,
  istShortcutAction,
  planFor,
  sollStarten,
  urlOhneAktion,
} from './shortcut-actions'

describe('Verknüpfungen', () => {
  it('kennt Schlaf, Stillen und Windel', () => {
    expect([...SHORTCUT_ACTIONS]).toEqual(['sleep-start', 'nursing-start', 'diaper'])
  })

  it('nimmt nur bekannte Aktionen an', () => {
    expect(istShortcutAction('sleep-start')).toBe(true)
    expect(istShortcutAction('essen')).toBe(false)
    expect(istShortcutAction(null)).toBe(false)
    expect(istShortcutAction(undefined)).toBe(false)
  })

  it('startet Timer, öffnet bei der Windel das Blatt', () => {
    expect(planFor('sleep-start')).toEqual({ art: 'timer', type: 'sleep' })
    expect(planFor('nursing-start')).toEqual({ art: 'timer', type: 'nursing' })
    expect(planFor('diaper')).toEqual({ art: 'dialog', type: 'diaper' })
  })
})

describe('sollStarten', () => {
  it('startet, wenn nichts läuft', () => {
    expect(sollStarten(planFor('sleep-start'), [])).toBe(true)
  })

  it('startet nichts, wenn derselbe Timer schon läuft', () => {
    expect(sollStarten(planFor('sleep-start'), ['sleep'])).toBe(false)
  })

  it('lässt sich von einem anderen laufenden Timer nicht aufhalten', () => {
    expect(sollStarten(planFor('sleep-start'), ['nursing'])).toBe(true)
  })

  it('startet für die Windel nie einen Timer', () => {
    expect(sollStarten(planFor('diaper'), [])).toBe(false)
  })
})

describe('urlOhneAktion', () => {
  it('entfernt genau den Aktionsparameter', () => {
    expect(urlOhneAktion('https://app.example/heute?action=sleep-start')).toBe('/heute')
    expect(urlOhneAktion('https://app.example/heute?action=diaper&kind=abc')).toBe('/heute?kind=abc')
  })

  it('lässt eine URL ohne Parameter in Ruhe', () => {
    expect(urlOhneAktion('https://app.example/heute')).toBe('/heute')
  })

  it('heißt wirklich „action"', () => {
    expect(SHORTCUT_PARAM).toBe('action')
  })
})
