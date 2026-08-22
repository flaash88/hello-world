import { beforeEach, describe, expect, it } from 'vitest'
import { generateInviteCode, hashToken, normalizeInviteCode, randomToken, safeEqual } from './tokens'

describe('randomToken', () => {
  it('erzeugt URL-sichere Token', () => {
    const token = randomToken(32)
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(token.length).toBeGreaterThan(40)
  })

  it('erzeugt jedes Mal einen anderen Wert', () => {
    const tokens = new Set(Array.from({ length: 500 }, () => randomToken(16)))
    expect(tokens.size).toBe(500)
  })
})

describe('hashToken', () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = 'test-secret'
  })

  it('ist deterministisch', () => {
    expect(hashToken('abc')).toBe(hashToken('abc'))
  })

  it('liefert einen SHA-256-Hex-Hash', () => {
    expect(hashToken('abc')).toMatch(/^[0-9a-f]{64}$/)
  })

  it('haengt vom Geheimnis ab', () => {
    const withSecret = hashToken('abc')
    process.env.SESSION_SECRET = 'anderes-secret'
    expect(hashToken('abc')).not.toBe(withSecret)
  })

  it('gibt das Token nicht preis', () => {
    expect(hashToken('geheim')).not.toContain('geheim')
  })
})

describe('safeEqual', () => {
  it('vergleicht gleiche Werte als gleich', () => {
    expect(safeEqual('abc', 'abc')).toBe(true)
  })

  it('erkennt Unterschiede', () => {
    expect(safeEqual('abc', 'abd')).toBe(false)
  })

  it('kommt mit unterschiedlichen Laengen zurecht', () => {
    expect(safeEqual('abc', 'abcd')).toBe(false)
    expect(safeEqual('', 'a')).toBe(false)
  })
})

describe('generateInviteCode', () => {
  it('hat das Format ABCD-EFGH', () => {
    expect(generateInviteCode()).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/)
  })

  it('vermeidet verwechselbare Zeichen', () => {
    const codes = Array.from({ length: 300 }, () => generateInviteCode()).join('')
    for (const char of ['I', 'O', '0', '1']) {
      expect(codes).not.toContain(char)
    }
  })

  it('wiederholt sich praktisch nie', () => {
    const codes = new Set(Array.from({ length: 500 }, () => generateInviteCode()))
    expect(codes.size).toBe(500)
  })
})

describe('normalizeInviteCode', () => {
  it('vereinheitlicht Gross-/Kleinschreibung und Leerzeichen', () => {
    expect(normalizeInviteCode(' abcd-efgh ')).toBe('ABCD-EFGH')
    expect(normalizeInviteCode('abcd efgh')).toBe('ABCDEFGH')
  })
})
