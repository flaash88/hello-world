import { describe, expect, it } from 'vitest'
import {
  MAX_KANTE,
  MINDESTGROESSE_BYTES,
  groesseText,
  lohntVerkleinern,
  verkleinereBild,
  zielMasse,
} from './verkleinern'

function datei(name: string, type: string, bytes: number): File {
  return new File([new Uint8Array(bytes)], name, { type })
}

describe('zielMasse', () => {
  it('verkleinert die längste Kante auf das Maximum', () => {
    expect(zielMasse(4032, 3024)).toEqual({ breite: 2048, hoehe: 1536 })
    expect(zielMasse(3024, 4032)).toEqual({ breite: 1536, hoehe: 2048 })
  })

  it('lässt kleine Bilder in Ruhe und vergrößert nie', () => {
    expect(zielMasse(800, 600)).toEqual({ breite: 800, hoehe: 600 })
    expect(zielMasse(MAX_KANTE, 100)).toEqual({ breite: MAX_KANTE, hoehe: 100 })
  })

  it('bleibt bei sehr schmalen Bildern bei mindestens einem Pixel', () => {
    expect(zielMasse(10_000, 1).hoehe).toBeGreaterThanOrEqual(1)
  })

  it('vertraegt Nullmaße, statt durch null zu teilen', () => {
    expect(zielMasse(0, 0)).toEqual({ breite: 0, hoehe: 0 })
  })
})

describe('lohntVerkleinern', () => {
  it('nimmt große Fotos', () => {
    expect(lohntVerkleinern(datei('foto.jpg', 'image/jpeg', 4 * 1024 * 1024))).toBe(true)
    expect(lohntVerkleinern(datei('foto.heic', 'image/heic', 3 * 1024 * 1024))).toBe(true)
  })

  it('lässt kleine Dateien in Ruhe', () => {
    expect(lohntVerkleinern(datei('klein.jpg', 'image/jpeg', MINDESTGROESSE_BYTES - 1))).toBe(false)
  })

  it('lässt animierte und vektorbasierte Formate in Ruhe', () => {
    // Canvas würde aus einem GIF ein Einzelbild machen und aus SVG ein Raster.
    expect(lohntVerkleinern(datei('a.gif', 'image/gif', 4 * 1024 * 1024))).toBe(false)
    expect(lohntVerkleinern(datei('a.svg', 'image/svg+xml', 4 * 1024 * 1024))).toBe(false)
  })

  it('fasst nichts an, was kein Bild ist', () => {
    expect(lohntVerkleinern(datei('a.pdf', 'application/pdf', 4 * 1024 * 1024))).toBe(false)
  })
})

describe('verkleinereBild', () => {
  it('gibt die Originaldatei zurück, wenn sich das Umkodieren nicht lohnt', async () => {
    const klein = datei('klein.jpg', 'image/jpeg', 1000)
    const ergebnis = await verkleinereBild(klein)
    expect(ergebnis.datei).toBe(klein)
    expect(ergebnis.verkleinert).toBe(false)
    expect(ergebnis.vorherBytes).toBe(1000)
  })

  it('gibt die Originaldatei zurück, wenn der Browser das Format nicht dekodiert', async () => {
    // In jsdom gibt es kein createImageBitmap – genau der Fall, der auf alten
    // Geräten mit HEIC auftritt.
    const gross = datei('foto.heic', 'image/heic', 4 * 1024 * 1024)
    const ergebnis = await verkleinereBild(gross)
    expect(ergebnis.datei).toBe(gross)
    expect(ergebnis.verkleinert).toBe(false)
  })
})

describe('groesseText', () => {
  it('nennt Megabyte mit einer Stelle und Dezimalkomma', () => {
    expect(groesseText(4 * 1024 * 1024)).toBe('4,0 MB')
    expect(groesseText(Math.round(1.55 * 1024 * 1024))).toBe('1,6 MB')
  })

  it('nennt darunter Kilobyte', () => {
    expect(groesseText(300 * 1024)).toBe('300 kB')
    expect(groesseText(10)).toBe('1 kB')
  })
})
