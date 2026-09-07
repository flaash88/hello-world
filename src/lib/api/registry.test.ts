import { describe, expect, it } from 'vitest'
import { EVENT_TYPES, HEALTH_KINDS } from '@/lib/events/types'
import { API_FELDER, API_TYPES, istApiType, windelArt, zielFor } from './registry'

describe('Typ-Registry', () => {
  it('leitet sich aus der Ereignis-Registry ab – jeder Ereignistyp ist dabei', () => {
    for (const type of EVENT_TYPES) {
      expect(API_TYPES, type).toContain(type)
    }
  })

  it('kennt auch die Gesundheits-Arten aus Phase 9', () => {
    for (const kind of HEALTH_KINDS) {
      expect(API_TYPES, kind).toContain(kind)
    }
    // Die in Phase 9 dazugekommenen, ausdrücklich:
    expect(API_TYPES).toContain('temperature')
    expect(API_TYPES).toContain('medication')
  })

  it('definiert nichts neu, was nicht aus den Registries kommt', () => {
    const bekannt = new Set<string>([...EVENT_TYPES, ...HEALTH_KINDS])
    for (const type of API_TYPES) {
      expect(bekannt.has(type), `${type} steht in keiner Registry`).toBe(true)
    }
  })

  it('hat keine doppelten Einträge', () => {
    expect(new Set(API_TYPES).size).toBe(API_TYPES.length)
  })

  it('beschreibt zu jedem Typ, welche Felder es gibt', () => {
    for (const type of API_TYPES) {
      expect(API_FELDER[type], type).toBeDefined()
    }
  })
})

describe('zielFor', () => {
  it('übersetzt einen Ereignistyp direkt', () => {
    expect(zielFor('diaper')).toEqual({ art: 'event', type: 'diaper' })
  })

  it('übersetzt eine Gesundheits-Art auf health plus kind', () => {
    expect(zielFor('temperature')).toEqual({ art: 'event', type: 'health', kind: 'temperature' })
    expect(zielFor('medication')).toEqual({ art: 'event', type: 'health', kind: 'medication' })
  })

  it('weist Unbekanntes ab', () => {
    expect(zielFor('kaffee')).toBeNull()
    expect(istApiType('kaffee')).toBe(false)
    expect(istApiType('sleep')).toBe(true)
  })
})

describe('windelArt', () => {
  it('übersetzt das, was ein NFC-Tag schickt', () => {
    expect(windelArt({ wet: true, soiled: false })).toBe('wet')
    expect(windelArt({ wet: false, soiled: true })).toBe('dirty')
    expect(windelArt({ wet: true, soiled: true })).toBe('both')
  })

  it('nimmt ohne Angabe nass an – das ist der häufigste Fall', () => {
    expect(windelArt({})).toBe('wet')
  })
})
