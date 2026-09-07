import { describe, expect, it } from 'vitest'
import {
  PUSH_KATEGORIEN,
  PUSH_KATEGORIEN_INFO,
  SCHALTBARE_KATEGORIEN,
  darfSenden,
  istKategorie,
  kategorieFuerReminder,
  standardPrefs,
} from './kategorien'

describe('darfSenden', () => {
  it('laesst ohne gespeicherte Einstellung nur Terminfristen durch', () => {
    expect(darfSenden('termin', null)).toBe(true)
    expect(darfSenden('schlaffenster', null)).toBe(false)
    expect(darfSenden('medikament', null)).toBe(false)
    expect(darfSenden('vorrat', null)).toBe(false)
    expect(darfSenden('nachtschicht', null)).toBe(false)
  })

  it('verschickt nie eine Kategorie, die nicht in der Liste steht', () => {
    // Aufforderungen und Zusammenfassungen kommen gar nicht erst so weit.
    expect(darfSenden('rueckblick', null)).toBe(false)
    expect(darfSenden('tracking-erinnerung', null)).toBe(false)
    expect(darfSenden('partner', null)).toBe(false)
    expect(darfSenden('feed', null)).toBe(false)
    // Auch nicht, wenn jemand eine passende Einstellung erfindet.
    expect(darfSenden('rueckblick', { appointmentAlerts: true })).toBe(false)
  })

  it('folgt dem Schalter, sobald einer gesetzt ist', () => {
    expect(darfSenden('schlaffenster', { sleepWindowAlerts: true })).toBe(true)
    expect(darfSenden('termin', { appointmentAlerts: false })).toBe(false)
  })

  it('laesst die Probenachricht ohne Schalter durch – sie kommt nur auf Knopfdruck', () => {
    expect(darfSenden('system', null)).toBe(true)
    expect(darfSenden('system', { appointmentAlerts: false })).toBe(true)
  })
})

describe('standardPrefs', () => {
  it('ist alles aus ausser Terminen', () => {
    expect(standardPrefs()).toEqual({
      appointmentAlerts: true,
      sleepWindowAlerts: false,
      medicationAlerts: false,
      milkStockAlerts: false,
      nightShiftAlerts: false,
    })
  })
})

describe('Liste', () => {
  it('erkennt genau die eingetragenen Kategorien', () => {
    for (const key of PUSH_KATEGORIEN) expect(istKategorie(key)).toBe(true)
    expect(istKategorie('irgendwas')).toBe(false)
  })

  it('hat für jede schaltbare Kategorie ein eigenes Feld', () => {
    const felder = SCHALTBARE_KATEGORIEN.map((info) => info.feld)
    expect(new Set(felder).size).toBe(felder.length)
    expect(felder.every(Boolean)).toBe(true)
  })

  it('beschreibt jede Kategorie ohne Aufforderung und ohne Ausrufezeichen', () => {
    for (const key of PUSH_KATEGORIEN) {
      const info = PUSH_KATEGORIEN_INFO[key]
      expect(info.hint.length).toBeGreaterThan(0)
      expect(info.hint).not.toMatch(/!/)
      expect(info.label).not.toMatch(/!/)
    }
  })

  it('hat genau eine Kategorie, die ab Werk etwas verschickt', () => {
    const an = SCHALTBARE_KATEGORIEN.filter((info) => info.standard)
    expect(an.map((info) => info.key)).toEqual(['termin'])
  })
})

describe('kategorieFuerReminder', () => {
  it('ordnet die gespeicherten Erinnerungsarten zu', () => {
    expect(kategorieFuerReminder('vorsorge')).toBe('termin')
    expect(kategorieFuerReminder('appointment')).toBe('termin')
    expect(kategorieFuerReminder('medication')).toBe('medikament')
    expect(kategorieFuerReminder('vorrat')).toBe('vorrat')
    expect(kategorieFuerReminder('nachtschicht')).toBe('nachtschicht')
    expect(kategorieFuerReminder('nap')).toBe('schlaffenster')
  })

  it('verschickt nichts für eine unbekannte Art', () => {
    expect(kategorieFuerReminder('wochenrueckblick')).toBe(null)
    expect(kategorieFuerReminder('')).toBe(null)
  })
})
