import { describe, expect, it } from 'vitest'
import type { StatEvent } from '@/lib/stats/aggregate'
import {
  PROTOKOLL_STANDARD,
  PROTOKOLL_TAGE,
  protokoll,
  schlafText,
  schnittVon,
  zellenText,
  type Gewichtsmessung,
} from './days'

const TZ = 'Europe/Vienna'
// Referenz: Mittwoch, 4. November 2026, 12:00 Wiener Zeit.
const JETZT = new Date('2026-11-04T11:00:00.000Z')
const GEBURT = new Date('2026-10-28T04:30:00.000Z')

let counter = 0
function event(
  type: string,
  iso: string,
  opts: { durationSec?: number; payload?: unknown; endedAt?: string } = {},
): StatEvent {
  counter += 1
  return {
    id: `e${counter}`,
    type,
    startedAt: new Date(iso),
    endedAt: opts.endedAt ? new Date(opts.endedAt) : null,
    durationSec: opts.durationSec ?? null,
    payload: opts.payload ?? {},
    running: false,
  }
}

describe('Zeitraeume', () => {
  it('bietet 1, 3, 7 und 14 Tage an, Standard 7', () => {
    expect([...PROTOKOLL_TAGE]).toEqual([1, 3, 7, 14])
    expect(PROTOKOLL_STANDARD).toBe(7)
  })
})

describe('protokoll', () => {
  const basis = { birthDate: GEBURT, timezone: TZ, now: JETZT }

  it('liefert eine Zeile je Tag, neueste oben', () => {
    const p = protokoll([], [], { ...basis, tage: 3 })
    expect(p.zeilen).toHaveLength(3)
    expect(p.zeilen.map((z) => z.dayKey)).toEqual(['2026-11-04', '2026-11-03', '2026-11-02'])
  })

  it('rechnet den Lebenstag je Zeile', () => {
    const p = protokoll([], [], { ...basis, tage: 3 })
    expect(p.zeilen[0]!.lebenstag).toBe(7)
    expect(p.zeilen[2]!.lebenstag).toBe(5)
  })

  it('lässt den Lebenstag ohne Geburtsdatum leer, statt ihn zu erfinden', () => {
    const p = protokoll([], [], { ...basis, birthDate: null, tage: 1 })
    expect(p.zeilen[0]!.lebenstag).toBeNull()
  })

  it('zählt Stillvorgänge und mittelt ihre Dauer', () => {
    const p = protokoll(
      [
        event('nursing', '2026-11-04T06:00:00Z', { durationSec: 900 }),
        event('nursing', '2026-11-04T09:00:00Z', { durationSec: 1500 }),
        event('nursing', '2026-11-04T10:30:00Z'),
      ],
      [],
      { ...basis, tage: 1 },
    )
    expect(p.zeilen[0]!.anlegen).toBe(3)
    // Nur die beiden mit Zeitangabe: 15 und 25 Minuten.
    expect(p.zeilen[0]!.stillDauerMin).toBe(20)
  })

  it('zieht den Rest von der Flaschenmenge ab', () => {
    const p = protokoll(
      [
        event('bottle', '2026-11-04T07:00:00Z', { payload: { amountMl: 120, leftoverMl: 20 } }),
        event('bottle', '2026-11-04T10:00:00Z', { payload: { amountMl: 90 } }),
      ],
      [],
      { ...basis, tage: 1 },
    )
    expect(p.zeilen[0]!.flasche).toBe(2)
    expect(p.zeilen[0]!.flascheMl).toBe(190)
  })

  it('lässt die Milliliter leer, wenn keine Menge eingetragen wurde', () => {
    const p = protokoll([event('bottle', '2026-11-04T07:00:00Z')], [], { ...basis, tage: 1 })
    expect(p.zeilen[0]!.flasche).toBe(1)
    expect(p.zeilen[0]!.flascheMl).toBeNull()
  })

  it('zählt „beides" in beide Windelspalten', () => {
    const p = protokoll(
      [
        event('diaper', '2026-11-04T06:00:00Z', { payload: { kind: 'wet' } }),
        event('diaper', '2026-11-04T08:00:00Z', { payload: { kind: 'dirty' } }),
        event('diaper', '2026-11-04T09:00:00Z', { payload: { kind: 'both' } }),
      ],
      [],
      { ...basis, tage: 1 },
    )
    expect(p.zeilen[0]!.windelnNass).toBe(2)
    expect(p.zeilen[0]!.windelnVoll).toBe(2)
  })

  it('teilt Schlaf über Mitternacht auf beide Tage auf', () => {
    const p = protokoll(
      [
        event('sleep', '2026-11-02T21:00:00Z', { endedAt: '2026-11-03T04:00:00Z' }),
      ],
      [],
      { ...basis, tage: 3 },
    )
    // 22:00–05:00 Wiener Zeit: zwei Stunden am 2., fünf am 3. November.
    const zweiter = p.zeilen.find((z) => z.dayKey === '2026-11-02')!
    const dritter = p.zeilen.find((z) => z.dayKey === '2026-11-03')!
    expect(zweiter.schlafMin).toBe(120)
    expect(dritter.schlafMin).toBe(300)
  })

  it('nimmt bei zwei Messungen am Tag die spätere', () => {
    const messungen: Gewichtsmessung[] = [
      { measuredAt: new Date('2026-11-04T07:00:00Z'), weightKg: 3.18 },
      { measuredAt: new Date('2026-11-04T17:00:00Z'), weightKg: 3.21 },
    ]
    const p = protokoll([], messungen, { ...basis, tage: 1 })
    expect(p.zeilen[0]!.gewichtG).toBe(3210)
  })

  it('lässt Tage ohne Messung leer', () => {
    const p = protokoll([], [], { ...basis, tage: 1 })
    expect(p.zeilen[0]!.gewichtG).toBeNull()
  })

  it('ordnet Ereignisse dem richtigen Kalendertag zu', () => {
    // 23:30 Wiener Zeit am 3. November ist 22:30 UTC.
    const p = protokoll([event('nursing', '2026-11-03T22:30:00Z')], [], { ...basis, tage: 3 })
    expect(p.zeilen.find((z) => z.dayKey === '2026-11-03')!.anlegen).toBe(1)
    expect(p.zeilen.find((z) => z.dayKey === '2026-11-04')!.anlegen).toBe(0)
  })
})

describe('schnittVon', () => {
  const basis = { birthDate: GEBURT, timezone: TZ, now: JETZT }

  it('mittelt Zählwerte über alle Tage', () => {
    const p = protokoll(
      [
        event('nursing', '2026-11-04T06:00:00Z'),
        event('nursing', '2026-11-04T09:00:00Z'),
        event('nursing', '2026-11-03T09:00:00Z'),
      ],
      [],
      { ...basis, tage: 3 },
    )
    expect(p.schnitt.tage).toBe(3)
    expect(p.schnitt.anlegen).toBe(1)
  })

  it('mittelt Milliliter nur über Tage, an denen es Flaschen gab', () => {
    const p = protokoll(
      [
        event('bottle', '2026-11-04T07:00:00Z', { payload: { amountMl: 100 } }),
        event('bottle', '2026-11-03T07:00:00Z', { payload: { amountMl: 140 } }),
      ],
      [],
      { ...basis, tage: 7 },
    )
    // Nicht 240 durch 7, sondern 240 durch die zwei Tage mit Flasche.
    expect(p.schnitt.flascheMl).toBe(120)
  })

  it('kommt mit einer leeren Tabelle klar', () => {
    const leer = schnittVon([])
    expect(leer.tage).toBe(0)
    expect(leer.stillDauerMin).toBeNull()
    expect(leer.flascheMl).toBeNull()
  })
})

describe('Darstellung', () => {
  it('lässt leere Zellen leer statt eine Null zu behaupten', () => {
    expect(zellenText(0)).toBe('')
    expect(zellenText(null)).toBe('')
    expect(zellenText(undefined)).toBe('')
    expect(zellenText(3)).toBe('3')
  })

  it('formatiert Schlaf kompakt', () => {
    expect(schlafText(0)).toBe('')
    expect(schlafText(45)).toBe('45 min')
    expect(schlafText(440)).toBe('7 h 20')
    expect(schlafText(605)).toBe('10 h 05')
  })
})
