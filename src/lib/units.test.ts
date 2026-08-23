import { describe, expect, it } from 'vitest'
import {
  DEFAULT_UNITS,
  formatLength,
  formatMass,
  formatTemperature,
  formatVolume,
  formatWeight,
  fromDisplay,
  roundedDisplay,
  toDisplay,
  unitLabel,
  unitPrefsFrom,
  unitStep,
  type UnitPrefs,
} from './units'

const IMPERIAL: UnitPrefs = { weight: 'lb', length: 'in', temp: 'f', volume: 'oz' }

describe('unitPrefsFrom', () => {
  it('faellt ohne Einstellungen auf metrisch zurueck', () => {
    expect(unitPrefsFrom(null)).toEqual(DEFAULT_UNITS)
    expect(unitPrefsFrom(undefined)).toEqual(DEFAULT_UNITS)
  })

  it('liest gesetzte Werte', () => {
    expect(
      unitPrefsFrom({ unitWeight: 'lb', unitLength: 'in', unitTemp: 'f', unitVolume: 'oz' }),
    ).toEqual(IMPERIAL)
  })

  it('ignoriert unbekannte Werte statt zu werfen', () => {
    expect(
      unitPrefsFrom({ unitWeight: 'stone', unitLength: 'ft', unitTemp: 'k', unitVolume: 'gal' }),
    ).toEqual(DEFAULT_UNITS)
  })
})

describe('Umrechnung', () => {
  it('rechnet Gewicht in beide Richtungen', () => {
    expect(toDisplay('weight', 1, IMPERIAL)).toBeCloseTo(2.20462, 4)
    expect(fromDisplay('weight', 2.20462, IMPERIAL)).toBeCloseTo(1, 4)
  })

  it('rechnet Laenge in beide Richtungen', () => {
    expect(toDisplay('length', 50, IMPERIAL)).toBeCloseTo(19.685, 3)
    expect(fromDisplay('length', 19.685, IMPERIAL)).toBeCloseTo(50, 3)
  })

  it('rechnet Temperatur inklusive Offset', () => {
    expect(toDisplay('temp', 37, IMPERIAL)).toBeCloseTo(98.6, 5)
    expect(fromDisplay('temp', 98.6, IMPERIAL)).toBeCloseTo(37, 5)
    expect(toDisplay('temp', 0, IMPERIAL)).toBe(32)
  })

  it('rechnet Volumen in beide Richtungen', () => {
    expect(toDisplay('volume', 29.5735295625, IMPERIAL)).toBeCloseTo(1, 6)
    expect(fromDisplay('volume', 4, IMPERIAL)).toBeCloseTo(118.294, 3)
  })

  it('laesst metrische Werte unveraendert', () => {
    for (const kind of ['weight', 'length', 'temp', 'volume'] as const) {
      expect(toDisplay(kind, 42.5, DEFAULT_UNITS)).toBe(42.5)
      expect(fromDisplay(kind, 42.5, DEFAULT_UNITS)).toBe(42.5)
    }
  })

  it('kommt bei Hin- und Rueckrechnung wieder beim Ausgangswert an', () => {
    for (const kind of ['weight', 'length', 'temp', 'volume'] as const) {
      const back = fromDisplay(kind, toDisplay(kind, 12.3, IMPERIAL), IMPERIAL)
      expect(back).toBeCloseTo(12.3, 9)
    }
  })
})

describe('Kleine Massen', () => {
  it('bleibt metrisch unter einem Kilo bei Gramm', () => {
    expect(formatMass(340)).toBe('340 g')
    expect(formatMass(1250)).toBe('1,25 kg')
  })

  it('nutzt Unzen und wechselt ab einem Pfund auf lb', () => {
    expect(formatMass(340, IMPERIAL)).toBe('12 oz')
    expect(formatMass(1250, IMPERIAL)).toBe('2,76 lb')
  })
})

describe('Anzeige', () => {
  it('rundet auf die Nachkommastellen der Einheit', () => {
    expect(roundedDisplay('volume', 118.294, IMPERIAL)).toBe(4)
    expect(roundedDisplay('weight', 3.456, DEFAULT_UNITS)).toBe(3.46)
    expect(roundedDisplay('length', 52.34, DEFAULT_UNITS)).toBe(52.3)
  })

  it('formatiert metrisch mit Dezimalkomma', () => {
    expect(formatWeight(6.25)).toBe('6,25 kg')
    expect(formatLength(62.5)).toBe('62,5 cm')
    expect(formatVolume(120)).toBe('120 ml')
    expect(formatTemperature(37)).toBe('37,0 °C')
  })

  it('formatiert imperial', () => {
    expect(formatWeight(6.25, IMPERIAL)).toBe('13,78 lb')
    expect(formatLength(62.5, IMPERIAL)).toBe('24,6 in')
    expect(formatVolume(120, IMPERIAL)).toBe('4,1 oz')
    expect(formatTemperature(37, IMPERIAL)).toBe('98,6 °F')
  })

  it('zeigt Temperatur immer mit einer Nachkommastelle, Volumen ohne', () => {
    expect(formatTemperature(38)).toBe('38,0 °C')
    expect(formatVolume(120.4)).toBe('120 ml')
  })

  it('kann die Einheit weglassen', () => {
    expect(formatWeight(6.25).endsWith('kg')).toBe(true)
    expect(unitLabel('volume', IMPERIAL)).toBe('oz')
    expect(unitLabel('temp')).toBe('°C')
  })

  it('nutzt je Einheit sinnvolle Schrittweiten', () => {
    expect(unitStep('volume')).toBe(10)
    expect(unitStep('volume', IMPERIAL)).toBe(0.5)
    expect(unitStep('weight')).toBe(0.05)
  })
})
