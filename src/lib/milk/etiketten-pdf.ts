import 'server-only'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { ascii } from '@/lib/print/document'
import { ETIKETTEN_PRO_SPALTE, ETIKETT_BREITE_MM, ETIKETT_HOEHE_MM } from './labels'

/**
 * Der Etikettenbogen als PDF.
 *
 * Anders als die übrigen Ausgaben hat dieser keine Ränder und keine Kopfzeile:
 * 70 × 37 mm, drei nebeneinander, acht untereinander – das sind exakt
 * 210 × 296 mm und passt damit auf die üblichen Universaletiketten. Genau
 * deshalb muss es ein PDF sein: Was der Browser aus der Seite macht, skaliert
 * er nach Gutdünken, und dann trifft der Druck die Bögen nicht mehr.
 */

const MM = 72 / 25.4
const ETIKETT_BREITE = ETIKETT_BREITE_MM * MM
const ETIKETT_HOEHE = ETIKETT_HOEHE_MM * MM
const ETIKETTEN_PRO_ZEILE = ETIKETTEN_PRO_SPALTE

const A4_BREITE = 210 * MM
const A4_HOEHE = 297 * MM

const INNEN = 4 * MM
const QR_KANTE = 22 * MM
const SCHWARZ = rgb(0, 0, 0)

export type EtikettPdf = {
  mengeText: string
  abgepumpt: string
  ablauf: string
  lagerort: string
  /** Punktraster des QR-Codes, oder `null` ohne gesetzte APP_URL. */
  qr: { groesse: number; punkte: boolean[] } | null
}

export async function buildEtikettenPdf(etiketten: EtikettPdf[]): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  pdf.setTitle('Etiketten')
  pdf.setCreator('Sprössling')
  pdf.setProducer('Sprössling')

  const regular = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const page = pdf.addPage([A4_BREITE, A4_HOEHE])

  etiketten.forEach((etikett, index) => {
    const spalte = index % ETIKETTEN_PRO_ZEILE
    const zeile = Math.floor(index / ETIKETTEN_PRO_ZEILE)
    const links = spalte * ETIKETT_BREITE
    // PDF zählt von unten, der Bogen wird von oben befüllt.
    const unten = A4_HOEHE - (zeile + 1) * ETIKETT_HOEHE

    const textBreite = ETIKETT_BREITE - 3 * INNEN - QR_KANTE
    let y = unten + ETIKETT_HOEHE - INNEN - 11

    const zeilen: [string, number, typeof regular][] = [
      [etikett.mengeText, 13, bold],
      [`Abgepumpt ${etikett.abgepumpt}`, 8, regular],
      [`Bis ${etikett.ablauf}`, 8, regular],
      [etikett.lagerort, 8, regular],
    ]

    for (const [text, groesse, schrift] of zeilen) {
      page.drawText(kuerze(ascii(text), schrift, groesse, textBreite), {
        x: links + INNEN,
        y,
        size: groesse,
        font: schrift,
        color: SCHWARZ,
      })
      y -= groesse + 2
    }

    if (etikett.qr) {
      zeichneQr(page, etikett.qr, {
        x: links + ETIKETT_BREITE - INNEN - QR_KANTE,
        y: unten + (ETIKETT_HOEHE - QR_KANTE) / 2,
        kante: QR_KANTE,
      })
    }
  })

  return pdf.save()
}

/** Zeichnet das Punktraster als Quadrate. */
function zeichneQr(
  page: ReturnType<PDFDocument['addPage']>,
  qr: { groesse: number; punkte: boolean[] },
  lage: { x: number; y: number; kante: number },
): void {
  const punktKante = lage.kante / qr.groesse
  for (let zeile = 0; zeile < qr.groesse; zeile++) {
    for (let spalte = 0; spalte < qr.groesse; spalte++) {
      if (!qr.punkte[zeile * qr.groesse + spalte]) continue
      page.drawRectangle({
        x: lage.x + spalte * punktKante,
        // Zeile 0 des Rasters gehört nach oben.
        y: lage.y + lage.kante - (zeile + 1) * punktKante,
        width: punktKante,
        height: punktKante,
        color: SCHWARZ,
      })
    }
  }
}

/** Schneidet ab, was nicht auf das Etikett passt – umbrochen wird hier nicht. */
function kuerze(
  text: string,
  font: { widthOfTextAtSize: (text: string, size: number) => number },
  groesse: number,
  breite: number,
): string {
  if (font.widthOfTextAtSize(text, groesse) <= breite) return text
  let gekuerzt = text
  while (gekuerzt.length > 1 && font.widthOfTextAtSize(`${gekuerzt}...`, groesse) > breite) {
    gekuerzt = gekuerzt.slice(0, -1)
  }
  return `${gekuerzt}...`
}
