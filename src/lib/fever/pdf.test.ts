import { describe, expect, it } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { buildFieberPdf, type FieberPdfInput } from './pdf'

const KOPF = {
  titel: 'Fieberverlauf',
  felder: [
    { label: 'Kind', wert: 'Lina' },
    { label: 'Geboren', wert: '3. Februar 2026 (6 Monate)' },
  ],
}

function eingabe(teile: Partial<FieberPdfInput> = {}): FieberPdfInput {
  return {
    kopf: KOPF,
    beginnText: '23. August 2026, 21:40',
    hoechsteText: '39,1 °C am 24. August 2026 um 03:10 (rektal)',
    tagText: '420 ml aus der Flasche · 6 nasse, 2 volle Windeln',
    messungen: [{ zeit: '24.08. 03:10', temperatur: '39,1 °C', ort: 'rektal', notiz: '' }],
    gaben: [{ zeit: '24.08. 03:20', mittel: 'Nurofen Saft', dosis: '2,5 ml', notiz: '' }],
    symptome: [{ zeit: '24.08. 08:00', text: 'Husten' }],
    ...teile,
  }
}

async function seiten(bytes: Uint8Array): Promise<number> {
  return (await PDFDocument.load(bytes)).getPageCount()
}

describe('buildFieberPdf', () => {
  it('baut ein PDF', async () => {
    const bytes = await buildFieberPdf(eingabe())
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-')
  })

  it('kommt ohne Messungen und ohne Gaben aus', async () => {
    // Eine Episode kann mit einer einzigen Eintragung beginnen – der Zettel
    // muss trotzdem entstehen.
    const bytes = await buildFieberPdf(
      eingabe({ messungen: [], gaben: [], symptome: [], hoechsteText: '—' }),
    )
    expect(await seiten(bytes)).toBe(1)
  })

  it('bricht eine lange Episode auf mehrere Seiten um', async () => {
    const messungen = Array.from({ length: 120 }, (_, i) => ({
      zeit: `24.08. ${String(i % 24).padStart(2, '0')}:00`,
      temperatur: '38,4 °C',
      ort: 'Ohr',
      notiz: '',
    }))
    expect(await seiten(await buildFieberPdf(eingabe({ messungen })))).toBeGreaterThan(1)
  })

  it('nimmt Umlaute und Gedankenstriche an', async () => {
    const bytes = await buildFieberPdf(
      eingabe({
        symptome: [{ zeit: '24.08. 08:00', text: 'Ohrenschmerzen – seit gestern, „stark“' }],
      }),
    )
    expect(await seiten(bytes)).toBe(1)
  })
})
