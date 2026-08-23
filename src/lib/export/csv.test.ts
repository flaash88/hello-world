import { describe, expect, it } from 'vitest'
import { CSV_BOM, eventsToCsv, measurementsToCsv, type ExportEvent } from './csv'

const TZ = 'Europe/Vienna'

function event(type: string, payload: unknown, note: string | null = null): ExportEvent {
  return {
    id: 'e1',
    type,
    startedAt: new Date('2026-11-15T08:00:00Z'),
    endedAt: new Date('2026-11-15T08:30:00Z'),
    durationSec: 1800,
    payload,
    note,
    createdBy: 'Mama',
  }
}

describe('eventsToCsv', () => {
  it('beginnt mit BOM und Kopfzeile', () => {
    const csv = eventsToCsv('sleep', [], TZ)
    expect(csv.startsWith(CSV_BOM)).toBe(true)
    expect(csv).toContain('Beginn;Ende;Dauer (Min);Eingetragen von;Notiz;Art;Ort')
  })

  it('trennt mit Semikolon und schreibt Dezimalkomma', () => {
    const csv = eventsToCsv('bottle', [event('bottle', { content: 'formula', amountMl: 120 })], TZ)
    const dataLine = csv.trim().split('\r\n')[1]!
    expect(dataLine).toContain(';')
    expect(dataLine).toContain('30,0')
    expect(dataLine).toContain('Pre-Nahrung')
  })

  it('uebersetzt Schluessel in lesbare Bezeichnungen', () => {
    const csv = eventsToCsv(
      'diaper',
      [event('diaper', { kind: 'dirty', color: 'mustard', texture: 'seedy' })],
      TZ,
    )
    expect(csv).toContain('Voll')
    expect(csv).toContain('Senfgelb')
    expect(csv).toContain('Körnig')
  })

  it('maskiert Semikolon, Anfuehrungszeichen und Zeilenumbrueche', () => {
    const csv = eventsToCsv('other', [event('other', { kind: 'note' }, 'Test; mit "Zitat"\nund Umbruch')], TZ)
    expect(csv).toContain('"Test; mit ""Zitat""')
  })

  it('filtert auf den angeforderten Typ', () => {
    const csv = eventsToCsv(
      'sleep',
      [event('sleep', { kind: 'nap' }), event('diaper', { kind: 'wet' })],
      TZ,
    )
    expect(csv.trim().split('\r\n')).toHaveLength(2)
  })

  it('schreibt Zeiten in Ortszeit', () => {
    const csv = eventsToCsv('sleep', [event('sleep', { kind: 'nap' })], TZ)
    // 08:00 UTC ist 09:00 in Wien (Winterzeit).
    expect(csv).toContain('09:00')
  })

  it('kommt mit fehlenden Feldern zurecht', () => {
    const csv = eventsToCsv('nursing', [event('nursing', {})], TZ)
    expect(csv.trim().split('\r\n')).toHaveLength(2)
  })

  it('listet Lebensmittel kommagetrennt in einer Zelle', () => {
    // Das Komma braucht keine Maskierung – getrennt wird mit Semikolon.
    const csv = eventsToCsv('solids', [event('solids', { foods: ['Karotte', 'Kartoffel'] })], TZ)
    expect(csv).toContain(';Karotte, Kartoffel;')
  })

  it('maskiert ein Semikolon im Lebensmittelnamen', () => {
    const csv = eventsToCsv('solids', [event('solids', { foods: ['Brei; selbst gekocht'] })], TZ)
    expect(csv).toContain('"Brei; selbst gekocht"')
  })
})

describe('measurementsToCsv', () => {
  it('exportiert Messungen mit Dezimalkomma', () => {
    const csv = measurementsToCsv(
      [
        {
          measuredAt: new Date('2026-11-15T08:00:00Z'),
          weightKg: 5.234,
          lengthCm: 58.5,
          headCm: 39,
          note: null,
        },
      ],
      TZ,
    )
    expect(csv).toContain('5,234')
    expect(csv).toContain('58,5')
    expect(csv).toContain('39,0')
  })

  it('laesst leere Werte leer', () => {
    const csv = measurementsToCsv(
      [{ measuredAt: new Date('2026-11-15T08:00:00Z'), weightKg: null, lengthCm: null, headCm: null, note: null }],
      TZ,
    )
    const dataLine = csv.trim().split('\r\n')[1]!
    expect(dataLine.split(';').slice(1).join('')).toBe('')
  })
})
