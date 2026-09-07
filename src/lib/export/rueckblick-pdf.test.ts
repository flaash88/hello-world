import { describe, expect, it } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import sharp from 'sharp'
import { buildRueckblickPdf, type RueckblickPdfInput } from './rueckblick-pdf'

const KOPF = {
  titel: 'Lina · 2026',
  felder: [{ label: 'Kind', wert: 'Lina' }],
}

async function jpeg(): Promise<Uint8Array> {
  const bytes = await sharp({
    create: { width: 64, height: 48, channels: 3, background: '#c2582c' },
  })
    .jpeg()
    .toBuffer()
  return new Uint8Array(bytes)
}

async function seiten(bytes: Uint8Array): Promise<number> {
  return (await PDFDocument.load(bytes)).getPageCount()
}

function eingabe(teile: Partial<RueckblickPdfInput> = {}): RueckblickPdfInput {
  return {
    kopf: KOPF,
    zahlen: [
      ['Tagebucheinträge', '12'],
      ['Meilensteine', '4'],
    ],
    meilensteine: [{ titel: 'Erstes Lächeln', datum: '3. April 2026' }],
    toene: [{ titel: 'Brabbeln', datum: '5. Mai 2026 · 0:12' }],
    eintraege: [
      { datum: '3. April 2026', titel: 'Ein guter Tag', text: 'Viel gelacht.', fotos: [] },
    ],
    ...teile,
  }
}

describe('buildRueckblickPdf', () => {
  it('baut ein PDF', async () => {
    const bytes = await buildRueckblickPdf(eingabe())
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-')
  })

  it('kommt mit einem leeren Jahr aus', async () => {
    const bytes = await buildRueckblickPdf(
      eingabe({ zahlen: [], meilensteine: [], toene: [], eintraege: [] }),
    )
    expect(await seiten(bytes)).toBe(1)
  })

  it('bettet Fotos ein', async () => {
    const foto = { jpeg: await jpeg() }
    const ohne = await buildRueckblickPdf(eingabe())
    const mit = await buildRueckblickPdf(
      eingabe({
        eintraege: [
          { datum: '3. April 2026', titel: null, text: 'Mit Bild.', fotos: [foto, foto, foto] },
        ],
      }),
    )
    expect(mit.byteLength).toBeGreaterThan(ohne.byteLength)
  })

  it('lässt ein unlesbares Foto weg, statt den Rückblick abzubrechen', async () => {
    const kaputt = { jpeg: new Uint8Array([1, 2, 3, 4]) }
    const bytes = await buildRueckblickPdf(
      eintragMitFotos([kaputt]),
    )
    expect(await seiten(bytes)).toBe(1)
  })

  it('bricht ein volles Jahr auf mehrere Seiten um', async () => {
    const eintraege = Array.from({ length: 60 }, (_, i) => ({
      datum: `Tag ${i}`,
      titel: `Eintrag ${i}`,
      text: 'Ein Satz, der das Jahr beschreibt, und noch einer, damit es Platz braucht.',
      fotos: [],
    }))
    expect(await seiten(await buildRueckblickPdf(eingabe({ eintraege })))).toBeGreaterThan(1)
  })
})

function eintragMitFotos(fotos: { jpeg: Uint8Array }[]): RueckblickPdfInput {
  return eingabe({
    eintraege: [{ datum: '3. April 2026', titel: null, text: 'Mit Bild.', fotos }],
  })
}
