import { describe, expect, it } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { buildEtikettenPdf, type EtikettPdf } from './etiketten-pdf'
import { ETIKETTEN_PRO_BOGEN } from './labels'

/** Ein kleines Raster, das aussieht wie ein QR-Code, ohne einer zu sein. */
function raster(groesse = 21): { groesse: number; punkte: boolean[] } {
  return {
    groesse,
    punkte: Array.from({ length: groesse * groesse }, (_, i) => i % 3 === 0),
  }
}

function etikett(teile: Partial<EtikettPdf> = {}): EtikettPdf {
  return {
    mengeText: '120 ml',
    abgepumpt: '20.08.',
    ablauf: '20.02.',
    lagerort: 'Tiefkühler · Beutel 4',
    qr: raster(),
    ...teile,
  }
}

describe('buildEtikettenPdf', () => {
  it('legt einen vollen Bogen auf eine einzige Seite', async () => {
    // 3 × 8 auf 210 × 296 mm – mehr als eine Seite hieße, die Masse stimmen nicht.
    const bogen = Array.from({ length: ETIKETTEN_PRO_BOGEN }, () => etikett())
    const pdf = await PDFDocument.load(await buildEtikettenPdf(bogen))
    expect(pdf.getPageCount()).toBe(1)
  })

  it('hat A4-Masse', async () => {
    const pdf = await PDFDocument.load(await buildEtikettenPdf([etikett()]))
    const { width, height } = pdf.getPage(0).getSize()
    expect(width).toBeCloseTo(595.28, 0)
    expect(height).toBeCloseTo(841.89, 0)
  })

  it('kommt ohne QR-Code aus', async () => {
    // Ohne gesetzte APP_URL bleibt der Code weg, statt ins Leere zu zeigen.
    const bytes = await buildEtikettenPdf([etikett({ qr: null })])
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-')
  })

  it('schneidet einen zu langen Lagerort ab, statt über das Etikett zu schreiben', async () => {
    const bytes = await buildEtikettenPdf([
      etikett({ lagerort: 'Tiefkühltruhe im Keller, zweite Lade von unten, hinten links' }),
    ])
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1)
  })

  it('kommt mit einem einzigen Etikett zurecht', async () => {
    expect((await PDFDocument.load(await buildEtikettenPdf([etikett()]))).getPageCount()).toBe(1)
  })
})
