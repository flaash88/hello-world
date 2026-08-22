import { describe, expect, it } from 'vitest'
import { hashPassword, verifyPassword } from './password'

describe('hashPassword', () => {
  it('erzeugt einen argon2id-Hash', async () => {
    const digest = await hashPassword('ein-sicheres-passwort')
    expect(digest.startsWith('$argon2id$')).toBe(true)
  })

  it('erzeugt fuer dasselbe Passwort unterschiedliche Hashes (Salt)', async () => {
    const a = await hashPassword('gleiches-passwort')
    const b = await hashPassword('gleiches-passwort')
    expect(a).not.toBe(b)
  })

  it('enthaelt das Passwort nicht im Klartext', async () => {
    expect(await hashPassword('geheim123456')).not.toContain('geheim123456')
  })
})

describe('verifyPassword', () => {
  it('bestaetigt das richtige Passwort', async () => {
    const digest = await hashPassword('richtig-und-lang-genug')
    expect(await verifyPassword(digest, 'richtig-und-lang-genug')).toBe(true)
  })

  it('lehnt das falsche Passwort ab', async () => {
    const digest = await hashPassword('richtig-und-lang-genug')
    expect(await verifyPassword(digest, 'falsch-und-lang-genug')).toBe(false)
  })

  it('wirft nicht bei kaputtem Hash, sondern liefert false', async () => {
    expect(await verifyPassword('kein-gueltiger-hash', 'egal')).toBe(false)
    expect(await verifyPassword('', 'egal')).toBe(false)
  })
})
