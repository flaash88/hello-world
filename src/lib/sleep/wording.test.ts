import { describe, expect, it } from 'vitest'
import type { SleepForecast, SleepPressure, WakeWindowModel } from './adaptive'
import {
  FORECAST_HINWEIS,
  kalibrierText,
  muedigkeitText,
  schlafdruckText,
  wachSeitText,
  wachfensterText,
} from './wording'

const TZ = 'Europe/Vienna'

const model: WakeWindowModel = {
  expectedMin: 105,
  lowerMin: 90,
  upperMin: 120,
  sampleSize: 8,
  adaptiveWeight: 0.8,
  confidence: 0.7,
  calibrating: false,
  baselineMin: 100,
}

function forecast(overrides: Partial<SleepForecast> = {}): SleepForecast {
  return {
    kind: 'nap',
    from: new Date('2026-08-23T11:40:00Z'),
    to: new Date('2026-08-23T12:10:00Z'),
    confidence: 0.7,
    calibrating: false,
    sampleSize: 8,
    due: false,
    ...overrides,
  }
}

/** Alle Texte dieses Moduls, für die gemeinsamen Regeln. */
function alleTexte(): string[] {
  const pressure: SleepPressure = { awakeMin: 100, ratio: 0.95, level: 'ready' }
  return [
    FORECAST_HINWEIS,
    schlafdruckText('fresh'),
    schlafdruckText('building'),
    schlafdruckText('ready'),
    schlafdruckText('overtired'),
    wachSeitText(pressure),
    muedigkeitText(forecast(), TZ),
    muedigkeitText(forecast({ due: true }), TZ),
    muedigkeitText(forecast({ kind: 'bedtime' }), TZ),
    wachfensterText(model),
    wachfensterText({ ...model, sampleSize: 0 }),
    kalibrierText({ ...model, calibrating: true, sampleSize: 1 }),
  ]
}

describe('Sprachregister', () => {
  it('kommt ohne Ausrufezeichen aus', () => {
    for (const text of alleTexte()) expect(text).not.toMatch(/!/)
  })

  it('gibt keine Anweisung und kündigt nichts für „jetzt" an', () => {
    for (const text of alleTexte()) {
      expect(text).not.toMatch(/\bjetzt\b/i)
      expect(text).not.toMatch(/\bleg\b|\blege\b|\bhinlegen\b|\bsollte\b|\bmuss\b|\bZeit für\b/i)
    }
  })

  it('nennt keine Prozentzahl auf eine Vermutung', () => {
    for (const text of alleTexte()) {
      expect(text).not.toMatch(/%/)
      expect(text).not.toMatch(/Konfidenz/i)
    }
  })

  it('bewertet nicht', () => {
    for (const text of alleTexte()) {
      expect(text).not.toMatch(/übermüdet|zu wenig|zu spät|Defizit|Ziel/i)
    }
  })
})

describe('muedigkeitText', () => {
  it('formuliert das nächste Fenster als Möglichkeit', () => {
    expect(muedigkeitText(forecast(), TZ)).toBe(
      'Ungefähr ab 13:40 könnte Müdigkeit kommen, meist bis 14:10',
    )
  })

  it('formuliert ein laufendes Fenster als Beobachtung, nicht als Countdown', () => {
    expect(muedigkeitText(forecast({ due: true }), TZ)).toBe(
      'Etwa seit 13:40 liegt die Zeit, in der zuletzt Müdigkeit kam',
    )
  })

  it('spricht bei der Nacht vom letzten Mal, nicht von einer Bettzeit', () => {
    const text = muedigkeitText(forecast({ kind: 'bedtime' }), TZ)
    expect(text).toBe('Zwischen 13:40 und 14:10 ging es zuletzt in die Nacht')
    expect(text).not.toMatch(/Bettzeit/)
  })
})

describe('wachfensterText', () => {
  it('nennt eine Spanne, keinen Punktwert', () => {
    expect(wachfensterText(model)).toBe(
      'Zuletzt lagen zwischen Aufwachen und Einschlafen etwa 1 Std 30 Min bis 2 Std.',
    )
  })

  it('fällt ohne eigene Messungen auf den Erfahrungswert zurück und sagt das', () => {
    const text = wachfensterText({ ...model, sampleSize: 0 })
    expect(text).toMatch(/in diesem Alter/)
    expect(text).not.toMatch(/Zuletzt/)
  })
})

describe('schlafdruckText', () => {
  it('beschreibt jede Stufe ohne Diagnose', () => {
    expect(schlafdruckText('overtired')).toBe('Länger wach als sonst')
    expect(schlafdruckText('fresh')).toBe('Gerade erst wach')
  })
})

describe('kalibrierText', () => {
  it('fordert nicht dazu auf, mehr einzutragen', () => {
    const text = kalibrierText({ ...model, calibrating: true, sampleSize: 1 })
    expect(text).not.toMatch(/trag|Trag/)
    expect(text).not.toMatch(/von 5/)
  })
})

describe('FORECAST_HINWEIS', () => {
  it('steht als fester Satz bereit', () => {
    expect(FORECAST_HINWEIS).toContain('Euer Kind kennt seinen Rhythmus besser als die App')
  })
})
