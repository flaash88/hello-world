import 'server-only'
import { cookies, headers } from 'next/headers'
import { cache } from 'react'
import { createHash } from 'node:crypto'
import { prisma } from '@/lib/db'
import { hashToken, randomToken } from './tokens'

export const SESSION_COOKIE = 'sp_session'
export const CSRF_COOKIE = 'sp_csrf'
const SESSION_TTL_DAYS = 60
/** Session-Verlaengerung erst nach einem Tag – spart Schreibzugriffe. */
const REFRESH_AFTER_MS = 24 * 60 * 60 * 1000

export type SessionUser = {
  id: string
  email: string
  displayName: string
  initials: string
  color: string
  role: string
  householdId: string
}

/**
 * Secure-Flag: in Produktion an, weil die App hinter HTTPS laeuft. Ueber
 * COOKIE_SECURE=false abschaltbar – noetig fuer E2E-Tests ueber http und fuer
 * Installationen, die nur im LAN ohne TLS erreichbar sind.
 */
export function cookiesAreSecure(): boolean {
  if (process.env.COOKIE_SECURE === 'false') return false
  if (process.env.COOKIE_SECURE === 'true') return true
  return process.env.NODE_ENV === 'production'
}

function cookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: cookiesAreSecure(),
    path: '/',
    maxAge: maxAgeSeconds,
  }
}

export async function createSession(userId: string): Promise<string> {
  const token = randomToken(32)
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 86400000)
  const hdrs = await headers()
  const forwarded = hdrs.get('x-forwarded-for') ?? ''
  await prisma.session.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt,
      userAgent: hdrs.get('user-agent')?.slice(0, 255) ?? null,
      ipHash: forwarded ? createHash('sha256').update(forwarded).digest('hex').slice(0, 32) : null,
    },
  })

  const store = await cookies()
  store.set(SESSION_COOKIE, token, cookieOptions(SESSION_TTL_DAYS * 86400))
  // Double-Submit-Token gegen CSRF: lesbar fuer den Client, wird bei jedem
  // schreibenden Request im Header gespiegelt und serverseitig verglichen.
  store.set(CSRF_COOKIE, randomToken(24), {
    ...cookieOptions(SESSION_TTL_DAYS * 86400),
    httpOnly: false,
  })
  return token
}

export async function destroySession(): Promise<void> {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (token) {
    await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } })
  }
  store.delete(SESSION_COOKIE)
  store.delete(CSRF_COOKIE)
}

/** Aktueller User oder null. Pro Request memoisiert. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (!token) return null

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  })
  if (!session || session.expiresAt.getTime() < Date.now()) return null

  if (Date.now() - session.lastSeenAt.getTime() > REFRESH_AFTER_MS) {
    await prisma.session.update({
      where: { id: session.id },
      data: {
        lastSeenAt: new Date(),
        expiresAt: new Date(Date.now() + SESSION_TTL_DAYS * 86400000),
      },
    })
  }

  const { user } = session
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    initials: user.initials,
    color: user.color,
    role: user.role,
    householdId: user.householdId,
  }
})

/** Wie getCurrentUser, wirft aber statt null zurueckzugeben. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser()
  if (!user) throw new UnauthorizedError()
  return user
}

export class UnauthorizedError extends Error {
  constructor() {
    super('Nicht angemeldet')
    this.name = 'UnauthorizedError'
  }
}
