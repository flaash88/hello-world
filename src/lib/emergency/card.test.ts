import { describe, expect, it } from 'vitest'
import {
  KONTAKT_ROLLEN,
  KONTAKT_VORLAGE,
  NOTRUFE,
  allergienAus,
  dauermedikamenteAus,
  istBefuellt,
  istKontaktRolle,
  telHref,
  type NotfallKarte,
} from './card'

describe('Feste Notrufnummern', () => {
  it('kennt Rettung, Vergiftungszentrale und Gesundheitsnummer', () => {
    expect(NOTRUFE.map((n) => n.nummer)).toEqual(['144', '01 406 43 43', '1450'])
  })

  it('hebt Rettung und Vergiftungszentrale hervor, die Beratung nicht', () => {
    expect(NOTRUFE.find((n) => n.nummer === '144')!.dringend).toBe(true)
    expect(NOTRUFE.find((n) => n.nummer === '01 406 43 43')!.dringend).toBe(true)
    expect(NOTRUFE.find((n) => n.nummer === '1450')!.dringend).toBe(false)
  })

  it('erklärt zu jeder Nummer, wofür sie da ist', () => {
    for (const notruf of NOTRUFE) {
      expect(notruf.hinweis.length, notruf.name).toBeGreaterThan(10)
    }
  })
})

describe('telHref', () => {
  it('entfernt alles, was nicht wählbar ist', () => {
    expect(telHref('01 406 43 43')).toBe('tel:014064343')
    expect(telHref('+43 664 1234567')).toBe('tel:+436641234567')
    expect(telHref('0662 / 44 82-0')).toBe('tel:066244820')
  })
})

describe('Kontaktrollen', () => {
  it('schlägt Kinderärztin, Hebamme, Klinik und zwei freie Plätze vor', () => {
    expect(KONTAKT_VORLAGE).toEqual(['kinderarzt', 'hebamme', 'klinik', 'frei', 'frei'])
    expect(KONTAKT_VORLAGE.filter((r) => r === 'frei')).toHaveLength(2)
  })

  it('nimmt nur bekannte Rollen an', () => {
    for (const rolle of KONTAKT_ROLLEN) expect(istKontaktRolle(rolle)).toBe(true)
    expect(istKontaktRolle('nachbarin')).toBe(false)
  })
})

describe('allergienAus', () => {
  it('liest Allergien aus der Gesundheitskategorie', () => {
    expect(
      allergienAus([
        { kind: 'allergy', allergy: 'Kuhmilcheiweiß' },
        { kind: 'symptom' },
        { kind: 'allergy', allergy: 'Nüsse' },
      ]),
    ).toEqual(['Kuhmilcheiweiß', 'Nüsse'])
  })

  it('fasst doppelte Einträge zusammen, unabhängig von der Schreibweise', () => {
    expect(
      allergienAus([
        { kind: 'allergy', allergy: 'Nüsse' },
        { kind: 'allergy', allergy: ' nüsse ' },
      ]),
    ).toEqual(['Nüsse'])
  })

  it('überspringt leere Einträge', () => {
    expect(allergienAus([{ kind: 'allergy', allergy: '  ' }, { kind: 'allergy' }])).toEqual([])
  })
})

describe('dauermedikamenteAus', () => {
  it('nimmt nur, was als Dauermedikament markiert ist', () => {
    expect(
      dauermedikamenteAus([
        { kind: 'medication', medication: 'Nurofen' },
        { kind: 'medication', medication: 'Vitamin D', dauerhaft: true },
        { kind: 'medication', medication: 'Fluorid', dauerhaft: true },
      ]),
    ).toEqual(['Vitamin D', 'Fluorid'])
  })

  it('bleibt leer, wenn nichts markiert ist', () => {
    expect(dauermedikamenteAus([{ kind: 'medication', medication: 'Nurofen' }])).toEqual([])
  })
})

describe('istBefuellt', () => {
  const leer: NotfallKarte = {
    stand: '2026-11-04T12:00:00.000Z',
    kind: {
      name: 'Lina',
      geburtsdatum: null,
      alter: null,
      gewicht: null,
      gewichtVom: null,
      blutgruppe: null,
      allergien: [],
      dauermedikamente: [],
      vorerkrankungen: null,
    },
    adresse: null,
    kontakte: [],
    impfungen: [],
  }

  it('meldet eine leere Karte als leer', () => {
    expect(istBefuellt(leer)).toBe(false)
  })

  it('gilt als befüllt, sobald etwas Nützliches dasteht', () => {
    expect(istBefuellt({ ...leer, adresse: 'Hauptstraße 1, 5020 Salzburg' })).toBe(true)
    expect(
      istBefuellt({ ...leer, kind: { ...leer.kind, allergien: ['Nüsse'] } }),
    ).toBe(true)
    expect(
      istBefuellt({
        ...leer,
        kontakte: [{ id: '1', rolle: 'kinderarzt', name: 'Dr. Berger', nummer: '0662 1234' }],
      }),
    ).toBe(true)
  })

  it('zählt Impfungen allein nicht als befüllt – die helfen im Notfall nicht', () => {
    expect(istBefuellt({ ...leer, impfungen: [{ titel: '6-fach', datum: '1. März' }] })).toBe(false)
  })
})
