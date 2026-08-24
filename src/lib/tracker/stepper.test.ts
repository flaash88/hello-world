import { describe, expect, it } from 'vitest'
import {
  SCHNELL_AB,
  SCHNELL_FAKTOR,
  alsEingabe,
  ausEingabe,
  beimVerlassen,
  naechsterWert,
  schrittFuer,
} from './stepper'

describe('ausEingabe', () => {
  it('nimmt das Komma als Dezimaltrennzeichen', () => {
    expect(ausEingabe('38,5')).toBe(38.5)
  })

  it('nimmt auch den Punkt', () => {
    expect(ausEingabe('38.5')).toBe(38.5)
  })

  it('gibt bei einem leeren Feld null zurück', () => {
    expect(ausEingabe('')).toBeNull()
    expect(ausEingabe('   ')).toBeNull()
  })

  it('gibt bei Unfug null zurück, statt zu raten', () => {
    expect(ausEingabe('abc')).toBeNull()
  })

  it('lässt eine einzelne Ziffer stehen, wie sie ist', () => {
    // Das ist der Zwischenstand beim Tippen von „38". Wird er hier schon auf
    // ein Minimum hochgezogen, macht die nächste Ziffer daraus den Maximalwert.
    expect(ausEingabe('3')).toBe(3)
  })
})

describe('alsEingabe', () => {
  it('schreibt Komma statt Punkt', () => {
    expect(alsEingabe(38.5)).toBe('38,5')
  })

  it('macht aus null ein leeres Feld', () => {
    expect(alsEingabe(null)).toBe('')
  })
})

describe('beimVerlassen', () => {
  it('begrenzt nach oben', () => {
    expect(beimVerlassen(308, 30, 45)).toBe(45)
  })

  it('begrenzt nach unten', () => {
    expect(beimVerlassen(3, 30, 45)).toBe(30)
  })

  it('lässt einen gültigen Wert unberührt', () => {
    expect(beimVerlassen(38, 30, 45)).toBe(38)
  })

  it('lässt ein leeres Feld leer', () => {
    expect(beimVerlassen(null, 30, 45)).toBeNull()
  })
})

describe('naechsterWert', () => {
  it('rechnet vom leeren Feld aus bei null los', () => {
    expect(naechsterWert(null, 10, 0, 500)).toBe(10)
  })

  it('rundet die Fliesskomma-Reste weg', () => {
    // 37,1 + 0,1 ergibt in Fliesskomma 37,199999999999996.
    expect(naechsterWert(37.1, 0.1, 30, 45)).toBe(37.2)
  })

  it('bleibt in den Grenzen', () => {
    expect(naechsterWert(44.9, 0.5, 30, 45)).toBe(45)
    expect(naechsterWert(30.1, -0.5, 30, 45)).toBe(30)
  })
})

describe('schrittFuer', () => {
  it('bleibt am Anfang fein, damit man einen Schritt noch trifft', () => {
    expect(schrittFuer(0, 0.1)).toBe(0.1)
    expect(schrittFuer(SCHNELL_AB - 1, 0.1)).toBe(0.1)
  })

  it('wird beim Halten gröber', () => {
    expect(schrittFuer(SCHNELL_AB, 0.1)).toBeCloseTo(0.1 * SCHNELL_FAKTOR)
    expect(schrittFuer(40, 10)).toBe(50)
  })

  it('bringt 36 auf 40 Grad in unter hundert Wiederholungen', () => {
    // Vorher war jeder Schritt 0,1 – das sind vierzig Taps.
    let wert = 36
    let wiederholungen = 0
    while (wert < 40 && wiederholungen < 100) {
      wert = naechsterWert(wert, schrittFuer(wiederholungen, 0.1), 30, 45)
      wiederholungen += 1
    }
    expect(wert).toBeGreaterThanOrEqual(40)
    expect(wiederholungen).toBeLessThan(20)
  })
})
