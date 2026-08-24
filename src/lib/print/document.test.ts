import { describe, expect, it } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import {
  ascii,
  drawTable,
  neuesDokument,
  platzSchaffen,
  wrap,
  type Spalte,
} from './document'

const SPALTEN: Spalte[] = [
  { titel: 'Zeitpunkt', anteil: 0.5 },
  { titel: 'Wert', anteil: 0.5, ausrichtung: 'rechts' },
]

async function seiten(bytes: Uint8Array): Promise<number> {
  return (await PDFDocument.load(bytes)).getPageCount()
}

describe('ascii', () => {
  it('ersetzt, was die Standardschriften nicht kennen', () => {
    expect(ascii('Halbschlaf – „ungefähr“ … 1 · 2')).toBe('Halbschlaf - "ungefähr" ... 1 - 2')
  })
})

describe('wrap', () => {
  it('bricht auf die Zielbreite um', async () => {
    const doc = await neuesDokument('Test')
    const zeilen = wrap('ein zwei drei vier fünf sechs sieben acht', doc.regular, 10, 60)
    expect(zeilen.length).toBeGreaterThan(1)
    expect(zeilen.join(' ')).toBe('ein zwei drei vier fünf sechs sieben acht')
  })

  it('lässt ein einzelnes zu langes Wort stehen, statt es zu verlieren', async () => {
    const doc = await neuesDokument('Test')
    expect(wrap('Donaudampfschifffahrtsgesellschaft', doc.regular, 10, 20)).toEqual([
      'Donaudampfschifffahrtsgesellschaft',
    ])
  })
})

describe('platzSchaffen', () => {
  it('bleibt auf der Seite, solange Platz ist', async () => {
    const doc = await neuesDokument('Test')
    expect(platzSchaffen(doc, 20)).toBe(false)
    expect(doc.pdf.getPageCount()).toBe(1)
  })

  it('fängt eine neue Seite an, wenn der Rest nicht mehr reicht', async () => {
    const doc = await neuesDokument('Test')
    doc.cursor.y = 50
    expect(platzSchaffen(doc, 40)).toBe(true)
    expect(doc.pdf.getPageCount()).toBe(2)
    expect(doc.cursor.y).toBeGreaterThan(700)
  })
})

describe('drawTable', () => {
  it('verteilt lange Tabellen über mehrere Seiten', async () => {
    const doc = await neuesDokument('Test')
    const zeilen = Array.from({ length: 200 }, (_, i) => [`Zeile ${i}`, String(i)])
    drawTable(doc, SPALTEN, zeilen)
    // Ohne Umbruch stünde alles unterhalb des Papierrands: im PDF vorhanden,
    // auf dem Ausdruck nicht.
    expect(await seiten(await doc.pdf.save())).toBeGreaterThan(1)
  })

  it('bleibt bei einer kurzen Tabelle auf einer Seite', async () => {
    const doc = await neuesDokument('Test')
    drawTable(doc, SPALTEN, [['heute', '1']])
    expect(await seiten(await doc.pdf.save())).toBe(1)
  })
})
