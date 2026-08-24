import 'server-only'
import {
  BODY_SIZE,
  SCHWARZ,
  SMALL_SIZE,
  drawHeading,
  drawKopf,
  drawRows,
  drawRule,
  drawTable,
  drawText,
  neuesDokument,
  platzSchaffen,
  type Doc,
  type Spalte,
} from '@/lib/print/document'
import type { Kopf } from '@/lib/print/kopf'

/**
 * Der Zettel für die Ordination als PDF.
 *
 * Dieselbe Aufteilung wie die Druckansicht im Browser: Kopfzeile, die drei
 * Eckdaten, dann die beiden Tabellen und Platz zum Mitschreiben. Schwarz auf
 * weiß, ohne Akzentfarbe und ohne App-Namen im Fließtext – das Papier gehört
 * der Ärztin.
 *
 * Formatiert wird außerhalb: der Builder bekommt fertige Zeichenketten, damit
 * Zeitzone, Sprache und Einheiten an einer Stelle bleiben.
 */
const MESSUNGEN: Spalte[] = [
  { titel: 'Zeitpunkt', anteil: 0.3 },
  { titel: 'Temperatur', anteil: 0.2, ausrichtung: 'rechts' },
  { titel: 'Gemessen', anteil: 0.2 },
  { titel: 'Notiz', anteil: 0.3 },
]

const GABEN: Spalte[] = [
  { titel: 'Zeitpunkt', anteil: 0.3 },
  { titel: 'Mittel', anteil: 0.25 },
  { titel: 'Dosis', anteil: 0.2 },
  { titel: 'Notiz', anteil: 0.25 },
]

export type FieberPdfInput = {
  kopf: Kopf
  /** Beginn der Episode, fertig formatiert. */
  beginnText: string
  /** Höchste gemessene Temperatur samt Zeitpunkt, oder „—". */
  hoechsteText: string
  /** Trinken und Windeln der letzten 24 Stunden in einem Satz. */
  tagText: string
  messungen: { zeit: string; temperatur: string; ort: string; notiz: string }[]
  gaben: { zeit: string; mittel: string; dosis: string; notiz: string }[]
  symptome: { zeit: string; text: string }[]
}

export async function buildFieberPdf(input: FieberPdfInput): Promise<Uint8Array> {
  const doc = await neuesDokument(input.kopf.titel)
  drawKopf(doc, input.kopf, { schwarzweiss: true })

  drawRows(
    doc.cursor,
    doc.regular,
    doc.bold,
    doc.width,
    [
      ['Fieber seit', input.beginnText],
      ['Höchste Temperatur', input.hoechsteText],
      ['Letzte 24 Stunden', input.tagText],
    ],
    { label: SCHWARZ, wert: SCHWARZ },
  )

  abschnitt(doc, 'Messungen')
  if (input.messungen.length === 0) {
    drawText(doc.cursor, 'keine Messungen', doc.regular, BODY_SIZE, SCHWARZ)
  } else {
    drawTable(
      doc,
      MESSUNGEN,
      input.messungen.map((m) => [m.zeit, m.temperatur, m.ort, m.notiz]),
      { schwarzweiss: true },
    )
  }

  abschnitt(doc, 'Medikamente')
  if (input.gaben.length === 0) {
    drawText(doc.cursor, 'keine Gaben', doc.regular, BODY_SIZE, SCHWARZ)
  } else {
    drawTable(
      doc,
      GABEN,
      input.gaben.map((g) => [g.zeit, g.mittel, g.dosis, g.notiz]),
      { schwarzweiss: true },
    )
  }

  abschnitt(doc, 'Symptome')
  if (input.symptome.length === 0) {
    drawText(doc.cursor, 'keine eingetragen', doc.regular, BODY_SIZE, SCHWARZ)
  } else {
    for (const symptom of input.symptome) {
      platzSchaffen(doc, BODY_SIZE + 6)
      drawText(doc.cursor, `${symptom.zeit} - ${symptom.text}`, doc.regular, BODY_SIZE, SCHWARZ)
    }
  }

  // Drei Linien: die Ärztin schreibt mit, und zwar auf demselben Blatt.
  abschnitt(doc, 'Platz für Notizen')
  for (let i = 0; i < 3; i++) {
    platzSchaffen(doc, 24)
    doc.cursor.y -= 16
    drawRule(doc.cursor, doc.width, SCHWARZ)
  }

  platzSchaffen(doc, 3 * (SMALL_SIZE + 4))
  doc.cursor.y -= 6
  drawText(
    doc.cursor,
    'Die App rechnet keine Dosierungen aus und prueft keine Hoechstmengen.',
    doc.regular,
    SMALL_SIZE,
    SCHWARZ,
  )
  drawText(
    doc.cursor,
    'Eingetragen wurde, was gemessen und gegeben wurde - nicht, was empfohlen ist.',
    doc.regular,
    SMALL_SIZE,
    SCHWARZ,
  )

  return doc.pdf.save()
}

/** Überschrift, die keine halbe Seite später allein steht. */
function abschnitt(doc: Doc, titel: string): void {
  platzSchaffen(doc, 60)
  drawHeading(doc.cursor, titel, doc.bold, SCHWARZ)
}
