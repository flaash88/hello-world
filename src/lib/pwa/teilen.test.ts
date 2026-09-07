import { describe, expect, it } from 'vitest'
import { dateinameAus, kannPdfTeilen, teilAusgang, type Teiler } from './teilen'

describe('kannPdfTeilen', () => {
  it('ist aus, wenn der Browser gar nicht teilen kann', () => {
    expect(kannPdfTeilen({})).toBe(false)
  })

  it('ist aus, wenn nur share da ist, aber kein canShare', () => {
    // Ohne canShare lässt sich nicht feststellen, ob Dateien gehen – dann
    // lieber den Weg über den Browser als ein Knopf, der ins Leere führt.
    expect(kannPdfTeilen({ share: async () => {} })).toBe(false)
  })

  it('ist an, wenn der Browser PDF-Dateien annimmt', () => {
    const nav: Teiler = { canShare: () => true, share: async () => {} }
    expect(kannPdfTeilen(nav)).toBe(true)
  })

  it('ist aus, wenn der Browser Dateien ablehnt', () => {
    const nav: Teiler = { canShare: () => false, share: async () => {} }
    expect(kannPdfTeilen(nav)).toBe(false)
  })

  it('bekommt genau eine PDF-Datei zu sehen', () => {
    let gefragt: { files?: File[] } | null = null
    kannPdfTeilen({
      canShare: (daten) => {
        gefragt = daten
        return true
      },
      share: async () => {},
    })
    expect(gefragt!.files).toHaveLength(1)
    expect(gefragt!.files![0]!.type).toBe('application/pdf')
  })

  it('bleibt aus, wenn canShare wirft', () => {
    const nav: Teiler = {
      canShare: () => {
        throw new Error('nope')
      },
      share: async () => {},
    }
    expect(kannPdfTeilen(nav)).toBe(false)
  })
})

describe('dateinameAus', () => {
  it('liest den Namen aus dem Kopf', () => {
    expect(dateinameAus('inline; filename="fieberverlauf-lina-2026-08-24.pdf"', 'x.pdf')).toBe(
      'fieberverlauf-lina-2026-08-24.pdf',
    )
  })

  it('kommt auch ohne Anführungszeichen zurecht', () => {
    expect(dateinameAus('inline; filename=etiketten.pdf', 'x.pdf')).toBe('etiketten.pdf')
  })

  it('nimmt den Ersatz, wenn kein Kopf da ist', () => {
    expect(dateinameAus(null, 'sproessling.pdf')).toBe('sproessling.pdf')
  })

  it('nimmt den Ersatz, wenn im Kopf kein Name steht', () => {
    expect(dateinameAus('inline', 'sproessling.pdf')).toBe('sproessling.pdf')
  })

  it('löst Prozentzeichen auf', () => {
    expect(dateinameAus("inline; filename*=UTF-8''r%C3%BCckblick.pdf", 'x.pdf')).toBe(
      'rückblick.pdf',
    )
  })
})

describe('teilAusgang', () => {
  it('wertet das Schließen des Blattes nicht als Fehler', () => {
    const fehler = new Error('abgebrochen')
    fehler.name = 'AbortError'
    expect(teilAusgang(fehler)).toBe('abgebrochen')
  })

  it('bittet um einen zweiten Tap, wenn die Geste verfallen ist', () => {
    const fehler = new Error('gesture')
    fehler.name = 'NotAllowedError'
    expect(teilAusgang(fehler)).toBe('nochmal')
  })

  it('nennt alles andere einen Fehler', () => {
    expect(teilAusgang(new Error('kaputt'))).toBe('fehler')
    expect(teilAusgang('irgendwas')).toBe('fehler')
  })
})
