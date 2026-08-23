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
import { schlafText, zellenText, type Protokoll } from './days'

/**
 * Stillprotokoll als PDF: eine A4-Seite, schwarz auf weiss, dieselbe Kopfzeile
 * wie die Druckansicht im Browser.
 *
 * Bewusst ohne Akzentfarbe und ohne App-Namen im Fliesstext – der Zettel
 * gehoert der Hebamme, nicht der App.
 */
const SPALTEN: Spalte[] = [
  { titel: 'Tag', anteil: 0.16 },
  { titel: 'LT', anteil: 0.07, ausrichtung: 'rechts' },
  { titel: 'Anlegen', anteil: 0.1, ausrichtung: 'rechts' },
  { titel: 'Dauer', anteil: 0.1, ausrichtung: 'rechts' },
  { titel: 'Flasche', anteil: 0.1, ausrichtung: 'rechts' },
  { titel: 'ml', anteil: 0.09, ausrichtung: 'rechts' },
  { titel: 'Nass', anteil: 0.08, ausrichtung: 'rechts' },
  { titel: 'Voll', anteil: 0.08, ausrichtung: 'rechts' },
  { titel: 'Schlaf', anteil: 0.11, ausrichtung: 'rechts' },
  { titel: 'Gewicht', anteil: 0.11, ausrichtung: 'rechts' },
]

export type ProtokollPdfInput = {
  kopf: Kopf
  protokoll: Protokoll
  /** Kurzes Datum je Zeile, in der Zeitzone des Haushalts vorformatiert. */
  tagText: (dayKey: string) => string
  zahl: (value: number) => string
}

export async function buildProtokollPdf(input: ProtokollPdfInput): Promise<Uint8Array> {
  const doc = await neuesDokument(input.kopf.titel)
  drawKopf(doc, input.kopf, { schwarzweiss: true })

  const zeilen = input.protokoll.zeilen.map((zeile) => [
    input.tagText(zeile.dayKey),
    zeile.lebenstag === null ? '' : String(zeile.lebenstag),
    zellenText(zeile.anlegen),
    zeile.stillDauerMin === null ? '' : `${zeile.stillDauerMin}`,
    zellenText(zeile.flasche),
    zeile.flascheMl === null ? '' : String(zeile.flascheMl),
    zellenText(zeile.windelnNass),
    zellenText(zeile.windelnVoll),
    schlafText(zeile.schlafMin),
    zeile.gewichtG === null ? '' : String(zeile.gewichtG),
  ])

  const schnitt = input.protokoll.schnitt
  drawTable(doc, SPALTEN, zeilen, {
    schwarzweiss: true,
    fussnote: [
      'Schnitt',
      '',
      input.zahl(schnitt.anlegen),
      schnitt.stillDauerMin === null ? '' : String(schnitt.stillDauerMin),
      input.zahl(schnitt.flasche),
      schnitt.flascheMl === null ? '' : String(schnitt.flascheMl),
      input.zahl(schnitt.windelnNass),
      input.zahl(schnitt.windelnVoll),
      schlafText(schnitt.schlafMin),
      '',
    ],
  })

  doc.cursor.y -= 10
  drawText(
    doc.cursor,
    'Dauer in Minuten je Stillvorgang, Gewicht in Gramm. Anlegen zaehlt Stillvorgaenge, nicht Seiten.',
    doc.regular,
    SMALL_SIZE,
    SCHWARZ,
  )
  drawText(
    doc.cursor,
    'Eine Windel mit beidem zaehlt in beide Spalten. Leere Zellen bedeuten: nichts eingetragen.',
    doc.regular,
    SMALL_SIZE,
    SCHWARZ,
  )

  return doc.pdf.save()
}
