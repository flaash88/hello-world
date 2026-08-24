import { describe, expect, it } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { buildZaehnePdf } from './pdf'

const KOPF = { titel: 'Zähne', felder: [{ label: 'Kind', wert: 'Lina' }] }

async function seiten(bytes: Uint8Array): Promise<number> {
  return (await PDFDocument.load(bytes)).getPageCount()
}

describe('buildZaehnePdf', () => {
  it('sagt es, wenn noch nichts eingetragen ist', async () => {
    const bytes = await buildZaehnePdf({ kopf: KOPF, zeilen: [], ausgefallen: [] })
    expect(await seiten(bytes)).toBe(1)
  })

  it('listet die eingetragenen Zähne', async () => {
    const bytes = await buildZaehnePdf({
      kopf: KOPF,
      zeilen: [
        {
          name: 'Mittlerer Schneidezahn',
          lage: 'unten links',
          durchbruch: '12. Juli 2026',
          lebensmonat: '6.',
        },
      ],
      ausgefallen: [],
    })
    expect(await seiten(bytes)).toBe(1)
  })

  it('führt Ausgefallene getrennt auf', async () => {
    const zeile = {
      name: 'Mittlerer Schneidezahn',
      lage: 'unten links',
      durchbruch: '3. März 2032',
      lebensmonat: '',
    }
    const bytes = await buildZaehnePdf({ kopf: KOPF, zeilen: [zeile], ausgefallen: [zeile] })
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-')
  })
})
