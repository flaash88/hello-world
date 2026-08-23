import 'server-only'
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import type { Kopf } from './kopf'

/**
 * Gemeinsame Bausteine fuer alle PDFs: A4, Helvetica, ein Cursor, der nach
 * unten wandert, und ein paar Zeichenfunktionen.
 *
 * Bewusst ohne eingebettete Schriften. pdf-lib kodiert die Standardschriften
 * als WinAnsi – Umlaute funktionieren, exotischere Zeichen nicht, deshalb
 * werden sie in `ascii()` ersetzt.
 */

export const A4_BREITE = 595.28
export const A4_HOEHE = 841.89
export const MARGIN = 48

export const TITLE_SIZE = 20
export const HEADING_SIZE = 12
export const BODY_SIZE = 10.5
export const SMALL_SIZE = 8.5

export const INK = rgb(0.14, 0.11, 0.09)
export const MUTED = rgb(0.45, 0.4, 0.36)
export const ACCENT = rgb(0.75, 0.34, 0.23)
export const RULE = rgb(0.85, 0.82, 0.78)
/** Fuer Ausgaben, die schwarzweiss bleiben sollen. */
export const SCHWARZ = rgb(0, 0, 0)

/** Ersetzt Zeichen, die WinAnsi nicht kennt. */
export function ascii(text: string): string {
  return text
    .replace(/[–—−]/g, '-')
    .replace(/[„“”]/g, '"')
    .replace(/[‚‘’]/g, "'")
    .replace(/…/g, '...')
    .replace(/·/g, '-')
    .replace(/[  ]/g, ' ')
    .replace(/[^\x20-\xFF]/g, '')
}

export type Cursor = { page: PDFPage; y: number }

export type Doc = {
  pdf: PDFDocument
  cursor: Cursor
  regular: PDFFont
  bold: PDFFont
  width: number
}

/** Legt ein einseitiges A4-Dokument an. */
export async function neuesDokument(titel: string): Promise<Doc> {
  const pdf = await PDFDocument.create()
  pdf.setTitle(titel)
  pdf.setCreator('Sprössling')
  pdf.setProducer('Sprössling')

  const regular = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const page = pdf.addPage([A4_BREITE, A4_HOEHE])

  return {
    pdf,
    cursor: { page, y: A4_HOEHE - MARGIN },
    regular,
    bold,
    width: A4_BREITE - 2 * MARGIN,
  }
}

export function drawText(
  cursor: Cursor,
  text: string,
  font: PDFFont,
  size: number,
  color = INK,
): void {
  cursor.page.drawText(ascii(text), { x: MARGIN, y: cursor.y, size, font, color })
  cursor.y -= size + 4
}

export function drawHeading(cursor: Cursor, text: string, font: PDFFont, color = ACCENT): void {
  cursor.y -= 8
  cursor.page.drawText(ascii(text), {
    x: MARGIN,
    y: cursor.y,
    size: HEADING_SIZE,
    font,
    color,
  })
  cursor.y -= HEADING_SIZE + 6
}

export function drawRule(cursor: Cursor, width: number, color = RULE): void {
  cursor.page.drawLine({
    start: { x: MARGIN, y: cursor.y },
    end: { x: MARGIN + width, y: cursor.y },
    thickness: 0.75,
    color,
  })
  cursor.y -= 14
}

export function drawBullet(cursor: Cursor, text: string, font: PDFFont, width: number): void {
  const lines = wrap(ascii(text), font, BODY_SIZE, width - 14)
  lines.forEach((line, index) => {
    cursor.page.drawText(index === 0 ? `- ${line}` : `  ${line}`, {
      x: MARGIN,
      y: cursor.y,
      size: BODY_SIZE,
      font,
      color: INK,
    })
    cursor.y -= BODY_SIZE + 4
  })
}

/** Label links, Wert rechtsbuendig – die Form fuer Kennzahlen. */
export function drawRows(
  cursor: Cursor,
  regular: PDFFont,
  bold: PDFFont,
  width: number,
  rows: [string, string][],
  farben: { label?: typeof INK; wert?: typeof INK } = {},
): void {
  for (const [label, value] of rows) {
    cursor.page.drawText(ascii(label), {
      x: MARGIN,
      y: cursor.y,
      size: BODY_SIZE,
      font: regular,
      color: farben.label ?? MUTED,
    })
    const text = ascii(value)
    const textWidth = bold.widthOfTextAtSize(text, BODY_SIZE)
    cursor.page.drawText(text, {
      x: MARGIN + width - textWidth,
      y: cursor.y,
      size: BODY_SIZE,
      font: bold,
      color: farben.wert ?? INK,
    })
    cursor.y -= BODY_SIZE + 6
  }
}

export type SpaltenAusrichtung = 'links' | 'rechts'

export type Spalte = {
  titel: string
  /** Anteil an der Gesamtbreite, Summe aller Spalten sollte 1 ergeben. */
  anteil: number
  ausrichtung?: SpaltenAusrichtung
}

/**
 * Tabelle mit Kopfzeile. Zahlenspalten stehen rechtsbuendig, damit sich die
 * Stellen untereinander decken – auf einem Protokoll, das jemand ueberfliegt,
 * ist das der halbe Nutzen.
 */
export function drawTable(
  doc: Doc,
  spalten: Spalte[],
  zeilen: string[][],
  opts: { fussnote?: string[]; schwarzweiss?: boolean } = {},
): void {
  const { cursor, regular, bold, width } = doc
  const tinte = opts.schwarzweiss ? SCHWARZ : INK
  const gedaempft = opts.schwarzweiss ? SCHWARZ : MUTED

  const x: number[] = []
  let laufend = MARGIN
  for (const spalte of spalten) {
    x.push(laufend)
    laufend += spalte.anteil * width
  }

  const zelle = (
    text: string,
    index: number,
    font: PDFFont,
    color: typeof INK,
    size = BODY_SIZE,
  ) => {
    const spalte = spalten[index]!
    const sauber = ascii(text)
    const links = x[index]!
    const breite = spalte.anteil * width
    const versatz =
      spalte.ausrichtung === 'rechts' ? breite - font.widthOfTextAtSize(sauber, size) - 4 : 0
    cursor.page.drawText(sauber, { x: links + versatz, y: cursor.y, size, font, color })
  }

  spalten.forEach((spalte, index) => zelle(spalte.titel, index, bold, gedaempft, SMALL_SIZE))
  cursor.y -= SMALL_SIZE + 4
  drawRule(cursor, width, opts.schwarzweiss ? SCHWARZ : RULE)
  cursor.y += 8

  for (const zeile of zeilen) {
    zeile.forEach((text, index) => zelle(text, index, regular, tinte))
    cursor.y -= BODY_SIZE + 5
  }

  if (opts.fussnote) {
    cursor.y += 2
    drawRule(cursor, width, opts.schwarzweiss ? SCHWARZ : RULE)
    cursor.y += 8
    opts.fussnote.forEach((text, index) => zelle(text, index, bold, tinte))
    cursor.y -= BODY_SIZE + 5
  }
}

/** Titel und Kopffelder, wie sie `druckKopf()` liefert. */
export function drawKopf(doc: Doc, kopf: Kopf, opts: { schwarzweiss?: boolean } = {}): void {
  const tinte = opts.schwarzweiss ? SCHWARZ : INK
  const gedaempft = opts.schwarzweiss ? SCHWARZ : MUTED

  drawText(doc.cursor, kopf.titel, doc.bold, TITLE_SIZE, tinte)
  doc.cursor.y -= 2

  for (const feld of kopf.felder) {
    const label = ascii(`${feld.label}: `)
    doc.cursor.page.drawText(label, {
      x: MARGIN,
      y: doc.cursor.y,
      size: BODY_SIZE,
      font: doc.regular,
      color: gedaempft,
    })
    doc.cursor.page.drawText(ascii(feld.wert), {
      x: MARGIN + doc.regular.widthOfTextAtSize(label, BODY_SIZE),
      y: doc.cursor.y,
      size: BODY_SIZE,
      font: doc.bold,
      color: tinte,
    })
    doc.cursor.y -= BODY_SIZE + 4
  }

  doc.cursor.y -= 8
  drawRule(doc.cursor, doc.width, opts.schwarzweiss ? SCHWARZ : RULE)
}

/** Einfacher Wortumbruch auf eine Zielbreite. */
export function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let current = ''

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && current) {
      lines.push(current)
      current = word
    } else {
      current = candidate
    }
  }
  if (current) lines.push(current)
  return lines
}
