import { describe, expect, it } from 'vitest'
import { eventDetail, eventDurationSec, eventTitle } from './format'

const at = (iso: string) => new Date(iso)

describe('eventTitle', () => {
  it('benennt Schlaf nach Art', () => {
    expect(
      eventTitle({ type: 'sleep', startedAt: at('2026-01-01T10:00:00Z'), endedAt: null, durationSec: null, payload: { kind: 'night' } }),
    ).toBe('Nachtschlaf')
  })

  it('haengt beim Stillen die Seite an', () => {
    expect(
      eventTitle({ type: 'nursing', startedAt: at('2026-01-01T10:00:00Z'), endedAt: null, durationSec: null, payload: { side: 'right' } }),
    ).toBe('Stillen · Rechts')
  })

  it('bevorzugt bei Sonstiges die eigene Bezeichnung', () => {
    expect(
      eventTitle({ type: 'other', startedAt: at('2026-01-01T10:00:00Z'), endedAt: null, durationSec: null, payload: { kind: 'bath', label: 'Erstes Wannenbad' } }),
    ).toBe('Erstes Wannenbad')
  })

  it('kommt mit fehlender Payload zurecht', () => {
    expect(
      eventTitle({ type: 'diaper', startedAt: at('2026-01-01T10:00:00Z'), endedAt: null, durationSec: null, payload: null }),
    ).toBe('Windel')
  })
})

describe('eventDetail', () => {
  it('fasst Stilldauern je Seite zusammen', () => {
    const detail = eventDetail({
      type: 'nursing',
      startedAt: at('2026-01-01T10:00:00Z'),
      endedAt: at('2026-01-01T10:20:00Z'),
      durationSec: 1200,
      payload: { side: 'both', leftSec: 480, rightSec: 720 },
    })
    expect(detail).toContain('links 8 min')
    expect(detail).toContain('rechts 12 min')
  })

  it('zeigt bei Beikost Lebensmittel und Erstkontakt', () => {
    const detail = eventDetail({
      type: 'solids',
      startedAt: at('2026-01-01T10:00:00Z'),
      endedAt: null,
      durationSec: null,
      payload: { foods: ['Karotte', 'Kartoffel'], firstTime: true, reaction: 'liked' },
    })
    expect(detail).toBe('Karotte, Kartoffel · erstes Mal · hat geschmeckt')
  })

  it('zeigt bei der Windel Farbe und Konsistenz im Klartext', () => {
    const detail = eventDetail({
      type: 'diaper',
      startedAt: at('2026-01-01T10:00:00Z'),
      endedAt: null,
      durationSec: null,
      payload: { kind: 'dirty', color: 'mustard', texture: 'seedy' },
    })
    expect(detail).toBe('Senfgelb · Körnig')
  })

  it('zeigt Medikament mit Dosis', () => {
    const detail = eventDetail({
      type: 'health',
      startedAt: at('2026-01-01T10:00:00Z'),
      endedAt: null,
      durationSec: null,
      payload: { kind: 'medication', medication: 'Fiebersaft', doseMl: 2.5 },
    })
    expect(detail).toBe('Fiebersaft, 2.5 ml')
  })

  it('haengt die Notiz an', () => {
    const detail = eventDetail({
      type: 'diaper',
      startedAt: at('2026-01-01T10:00:00Z'),
      endedAt: null,
      durationSec: null,
      payload: { kind: 'wet' },
      note: 'Vor dem Spaziergang',
    })
    expect(detail).toBe('Vor dem Spaziergang')
  })

  it('liefert null, wenn es nichts zu sagen gibt', () => {
    expect(
      eventDetail({ type: 'diaper', startedAt: at('2026-01-01T10:00:00Z'), endedAt: null, durationSec: null, payload: { kind: 'wet' } }),
    ).toBeNull()
  })
})

describe('eventDurationSec', () => {
  it('bevorzugt die gespeicherte Dauer', () => {
    expect(
      eventDurationSec({ type: 'sleep', startedAt: at('2026-01-01T10:00:00Z'), endedAt: at('2026-01-01T11:00:00Z'), durationSec: 3000, payload: {} }),
    ).toBe(3000)
  })

  it('rechnet bei laufenden Timern bis jetzt', () => {
    const now = at('2026-01-01T11:00:00Z')
    expect(
      eventDurationSec({ type: 'sleep', startedAt: at('2026-01-01T10:30:00Z'), endedAt: null, durationSec: null, payload: {} }, now),
    ).toBe(1800)
  })

  it('liefert bei Punkt-Events null', () => {
    expect(
      eventDurationSec({ type: 'diaper', startedAt: at('2026-01-01T10:00:00Z'), endedAt: null, durationSec: null, payload: {} }),
    ).toBeNull()
  })
})

describe('Einheitenformatierung', () => {
  it('formatiert Milliliter und Temperatur deutsch', () => {
    expect(
      eventDetail({
        type: 'bottle',
        startedAt: at('2026-01-01T10:00:00Z'),
        endedAt: null,
        durationSec: null,
        payload: { content: 'formula', amountMl: 120 },
      }),
    ).toContain('120 ml')
    expect(
      eventDetail({
        type: 'health',
        startedAt: at('2026-01-01T10:00:00Z'),
        endedAt: null,
        durationSec: null,
        payload: { kind: 'temperature', temperatureC: 37.05 },
      }),
    ).toContain('37,1 °C')
  })

  it('folgt der eingestellten Einheit', () => {
    expect(
      eventDetail(
        {
          type: 'bottle',
          startedAt: at('2026-01-01T10:00:00Z'),
          endedAt: null,
          durationSec: null,
          payload: { content: 'formula', amountMl: 120 },
        },
        { weight: 'lb', length: 'in', temp: 'f', volume: 'oz' },
      ),
    ).toContain('4,1 oz')
  })
})
