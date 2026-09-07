import 'server-only'
import {
  SCHWARZ,
  SMALL_SIZE,
  drawKopf,
  drawTable,
  drawText,
  neuesDokument,
  type Spalte,
} from '@/lib/print/document'
import type { Kopf } from '@/lib/print/kopf'

/**
 * Das Zahnschema als PDF – als Liste, nicht als Zeichnung.
 *
 * Am Bildschirm ist der gezeichnete Kiefer das Hilfreiche: man tippt den Zahn
 * an, den man meint. Auf Papier zählt die andere Frage, nämlich wann welcher
 * Zahn kam; dafür ist eine Tabelle das bessere Format, und sie lässt sich in
 * der Ordination vorlesen.
 */
const SPALTEN: Spalte[] = [
  { titel: 'Zahn', anteil: 0.34 },
  { titel: 'Lage', anteil: 0.2 },
  { titel: 'Durchbruch', anteil: 0.24 },
  { titel: 'Lebensmonat', anteil: 0.22, ausrichtung: 'rechts' },
]

export type ZahnZeile = {
  name: string
  lage: string
  durchbruch: string
  lebensmonat: string
}

export type ZaehnePdfInput = {
  kopf: Kopf
  zeilen: ZahnZeile[]
  /** Ausgefallene Zähne, falls es welche gibt. */
  ausgefallen: ZahnZeile[]
}

export async function buildZaehnePdf(input: ZaehnePdfInput): Promise<Uint8Array> {
  const doc = await neuesDokument(input.kopf.titel)
  drawKopf(doc, input.kopf, { schwarzweiss: true })

  if (input.zeilen.length === 0) {
    drawText(doc.cursor, 'Noch kein Zahn eingetragen.', doc.regular, SMALL_SIZE, SCHWARZ)
    return doc.pdf.save()
  }

  drawTable(
    doc,
    SPALTEN,
    input.zeilen.map((z) => [z.name, z.lage, z.durchbruch, z.lebensmonat]),
    { schwarzweiss: true },
  )

  if (input.ausgefallen.length > 0) {
    doc.cursor.y -= 10
    drawText(doc.cursor, 'Ausgefallen', doc.bold, SMALL_SIZE, SCHWARZ)
    drawTable(
      doc,
      [
        { titel: 'Zahn', anteil: 0.34 },
        { titel: 'Lage', anteil: 0.2 },
        { titel: 'Ausgefallen', anteil: 0.46 },
      ],
      input.ausgefallen.map((z) => [z.name, z.lage, z.durchbruch]),
      { schwarzweiss: true },
    )
  }

  doc.cursor.y -= 10
  drawText(
    doc.cursor,
    'Aufgefuehrt ist, was eingetragen wurde. Was fehlt, heisst nicht, dass es fehlt.',
    doc.regular,
    SMALL_SIZE,
    SCHWARZ,
  )

  return doc.pdf.save()
}
