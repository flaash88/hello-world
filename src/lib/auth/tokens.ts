import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

/** Zufaelliger, URL-sicherer Token (Session, Einladungscode, CSRF). */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url')
}

/**
 * Session-Tokens und Einladungscodes landen nur gehasht in der DB – ein
 * DB-Dump erlaubt damit keine Uebernahme bestehender Sessions.
 */
export function hashToken(token: string): string {
  const secret = process.env.SESSION_SECRET ?? ''
  return createHash('sha256').update(`${secret}:${token}`).digest('hex')
}

export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

/** Einladungscode im Format ABCD-EFGH – gut vorlesbar. */
export function generateInviteCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // ohne I/O/0/1
  const pick = (n: number) =>
    Array.from(randomBytes(n))
      .map((b) => alphabet[b % alphabet.length]!)
      .join('')
  return `${pick(4)}-${pick(4)}`
}

export function normalizeInviteCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, '')
}
