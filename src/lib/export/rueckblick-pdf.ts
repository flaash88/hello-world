import 'server-only'
import {
  BODY_SIZE,
  HEADING_SIZE,
  MARGIN,
  SMALL_SIZE,
  drawHeading,
  drawKopf,
  drawRows,
  drawText,
  neuesDokument,
  platzSchaffen,
  wrap,
  type Doc,
} from '@/lib/print/document'
import type { Kopf } from '@/lib/print/kopf'

/**
 * Der Jahresrückblick als PDF – das eine Dokument aus dieser App, das jemand
 * ausdruckt, um es aufzuheben. Deshalb mit Fotos und in Farbe, anders als
 * Stillprotokoll und Arztzettel.
 *
 * Die Bilder kommen schon als JPEG herein; das Umkodieren aus dem gespeicherten
 * WebP passiert in der Route, weil `pdf-lib` nur JPEG und PNG einbetten kann.
 */

/** Drei Fotos nebeneinander, wie in der Ansicht am Bildschirm. */
const FOTOS_PRO_ZEILE = 3
const FOTO_ABSTAND = 6

export type RueckblickFoto = { jpeg: Uint8Array }

export type RueckblickPdfInput = {
  kopf: Kopf
  /** „Das Jahr in Zahlen", als Label-Wert-Paare. */
  zahlen: [string, string][]
  meilensteine: { titel: string; datum: string }[]
  toene: { titel: string; datum: string }[]
  eintraege: {
    datum: string
    titel: string | null
    text: string
    fotos: RueckblickFoto[]
  }[]
}

export async function buildRueckblickPdf(input: RueckblickPdfInput): Promise<Uint8Array> {
  const doc = await neuesDokument(input.kopf.titel)
  drawKopf(doc, input.kopf)

  if (input.zahlen.length > 0) {
    drawHeading(doc.cursor, 'Das Jahr in Zahlen', doc.bold)
    drawRows(doc.cursor, doc.regular, doc.bold, doc.width, input.zahlen)
  }

  if (input.meilensteine.length > 0) {
    abschnitt(doc, 'Gelernt')
    drawRows(
      doc.cursor,
      doc.regular,
      doc.bold,
      doc.width,
      input.meilensteine.map((m) => [m.datum, m.titel]),
    )
  }

  if (input.toene.length > 0) {
    abschnitt(doc, 'Aufnahmen')
    drawRows(
      doc.cursor,
      doc.regular,
      doc.bold,
      doc.width,
      input.toene.map((t) => [t.datum, t.titel]),
    )
  }

  if (input.eintraege.length > 0) {
    abschnitt(doc, 'Aus dem Tagebuch')
    for (const eintrag of input.eintraege) {
      await zeichneEintrag(doc, eintrag)
    }
  }

  return doc.pdf.save()
}

async function zeichneEintrag(
  doc: Doc,
  eintrag: RueckblickPdfInput['eintraege'][number],
): Promise<void> {
  // Datum und Überschrift sollen nicht allein am Seitenende stehen bleiben.
  platzSchaffen(doc, 70)
  doc.cursor.y -= 6
  drawText(doc.cursor, eintrag.datum, doc.regular, SMALL_SIZE)
  if (eintrag.titel) drawText(doc.cursor, eintrag.titel, doc.bold, HEADING_SIZE)

  if (eintrag.fotos.length > 0) await zeichneFotos(doc, eintrag.fotos)

  for (const zeile of wrap(eintrag.text, doc.regular, BODY_SIZE, doc.width)) {
    platzSchaffen(doc, BODY_SIZE + 6)
    drawText(doc.cursor, zeile, doc.regular, BODY_SIZE)
  }
  doc.cursor.y -= 6
}

async function zeichneFotos(doc: Doc, fotos: RueckblickFoto[]): Promise<void> {
  const zellenBreite = (doc.width - (FOTOS_PRO_ZEILE - 1) * FOTO_ABSTAND) / FOTOS_PRO_ZEILE

  for (let start = 0; start < fotos.length; start += FOTOS_PRO_ZEILE) {
    const zeile = fotos.slice(start, start + FOTOS_PRO_ZEILE)
    const bilder: { bild: Awaited<ReturnType<Doc['pdf']['embedJpg']>>; hoehe: number }[] = []
    for (const foto of zeile) {
      try {
        const bild = await doc.pdf.embedJpg(foto.jpeg)
        // Auf Zellenbreite skalieren, das Seitenverhältnis bleibt.
        bilder.push({ bild, hoehe: (bild.height / bild.width) * zellenBreite })
      } catch {
        // Ein Bild, das sich nicht einbetten lässt, lässt den Rückblick nicht
        // scheitern – es fehlt dann eben eines.
      }
    }
    if (bilder.length === 0) continue

    const zeilenHoehe = Math.max(...bilder.map((b) => b.hoehe))
    platzSchaffen(doc, zeilenHoehe + 10)
    doc.cursor.y -= zeilenHoehe + 4

    bilder.forEach((eintrag, index) => {
      doc.cursor.page.drawImage(eintrag.bild, {
        x: MARGIN + index * (zellenBreite + FOTO_ABSTAND),
        y: doc.cursor.y,
        width: zellenBreite,
        height: eintrag.hoehe,
      })
    })
    doc.cursor.y -= 6
  }
}

/** Überschrift, die keine halbe Seite später allein steht. */
function abschnitt(doc: Doc, titel: string): void {
  platzSchaffen(doc, 70)
  drawHeading(doc.cursor, titel, doc.bold)
}
