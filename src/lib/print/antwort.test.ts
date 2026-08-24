import { describe, expect, it } from 'vitest'
import { pdfAntwort } from './antwort'

describe('pdfAntwort', () => {
  const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46])

  it('liefert inline aus, nicht als Anhang', () => {
    // attachment tut in der installierten App auf dem iPhone nichts Sichtbares.
    const antwort = pdfAntwort(bytes, 'test.pdf')
    expect(antwort.headers.get('Content-Disposition')).toBe('inline; filename="test.pdf"')
  })

  it('nennt den Dateinamen trotzdem, für den Fall, dass jemand speichert', () => {
    const antwort = pdfAntwort(bytes, 'stillprotokoll-lina-2026-08-24.pdf')
    expect(antwort.headers.get('Content-Disposition')).toContain(
      'stillprotokoll-lina-2026-08-24.pdf',
    )
  })

  it('setzt den Inhaltstyp und verbietet das Zwischenspeichern', () => {
    const antwort = pdfAntwort(bytes, 'test.pdf')
    expect(antwort.headers.get('Content-Type')).toBe('application/pdf')
    expect(antwort.headers.get('Cache-Control')).toBe('no-store')
  })
})
