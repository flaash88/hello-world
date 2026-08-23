import 'server-only'
import { prisma } from '@/lib/db'
import { hashToken, randomToken } from '@/lib/auth/tokens'
import { checkRateLimit, recordAttempt } from '@/lib/auth/rate-limit'

/**
 * Authentifizierung fuer /api/v1.
 *
 * Ausdruecklich nicht ueber das Session-Cookie: ein Token, das am NFC-Tag oder
 * in der Home-Assistant-Konfiguration steht, soll einzeln widerrufbar sein und
 * nicht dieselben Rechte haben wie eine angemeldete Person am Handy. Cookies
 * werden deshalb gar nicht erst gelesen – das schliesst CSRF ueber diese
 * Endpunkte von vornherein aus.
 */
export const RATE_LIMIT = 60
export const RATE_WINDOW_SEC = 60
export const TOKEN_PREFIX = 'sp_'

export type ApiKontext = {
  tokenId: string
  householdId: string
  userId: string
  userName: string
}

export type ApiFehler = { status: number; fehler: string; retryAfterSec?: number }

/** Erzeugt einen neuen Token. Der Klartext ist danach nie wieder abrufbar. */
export function neuerToken(): string {
  return `${TOKEN_PREFIX}${randomToken(24)}`
}

function bearerAus(request: Request): string | null {
  const header = request.headers.get('authorization')
  if (!header) return null
  const [art, wert] = header.split(' ')
  if (!wert || art?.toLowerCase() !== 'bearer') return null
  return wert.trim() || null
}

/**
 * Prueft den Bearer-Token und das Rate-Limit. Gibt entweder den Kontext oder
 * einen fertigen Fehler zurueck.
 */
export async function authentifiziere(request: Request): Promise<ApiKontext | ApiFehler> {
  const token = bearerAus(request)
  if (!token) {
    return { status: 401, fehler: 'Kein Token. Erwartet wird: Authorization: Bearer <token>' }
  }

  const eintrag = await prisma.integrationToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { select: { displayName: true } } },
  })
  if (!eintrag || eintrag.revokedAt) return { status: 401, fehler: 'Token ungültig oder widerrufen.' }

  const limit = await checkRateLimit('api', eintrag.id, RATE_LIMIT, RATE_WINDOW_SEC)
  if (!limit.allowed) {
    return {
      status: 429,
      fehler: `Zu viele Anfragen. Erlaubt sind ${RATE_LIMIT} pro Minute.`,
      retryAfterSec: limit.retryAfterSec,
    }
  }
  await recordAttempt('api', eintrag.id)

  // Nur ungefaehr mitschreiben: jede Anfrage einen Schreibvorgang zu kosten,
  // waere fuer einen Sensor, der jede Minute fragt, unnoetig.
  if (!eintrag.lastUsedAt || Date.now() - eintrag.lastUsedAt.getTime() > 60_000) {
    await prisma.integrationToken.update({
      where: { id: eintrag.id },
      data: { lastUsedAt: new Date() },
    })
  }

  return {
    tokenId: eintrag.id,
    householdId: eintrag.householdId,
    userId: eintrag.userId,
    userName: eintrag.user.displayName,
  }
}

export function istFehler(wert: ApiKontext | ApiFehler): wert is ApiFehler {
  return 'status' in wert
}

/** Antwort mit den Kopfzeilen, die diese API immer setzt. */
export function apiAntwort(daten: unknown, init: ResponseInit = {}): Response {
  return Response.json(daten, {
    ...init,
    headers: {
      'Cache-Control': 'no-store',
      // Kein CORS: die API ist fuer Home Assistant im eigenen Netz da, nicht
      // fuer fremde Webseiten im Browser.
      'X-Content-Type-Options': 'nosniff',
      ...init.headers,
    },
  })
}

export function fehlerAntwort(fehler: ApiFehler): Response {
  return apiAntwort(
    { error: fehler.fehler },
    {
      status: fehler.status,
      headers: fehler.retryAfterSec ? { 'Retry-After': String(fehler.retryAfterSec) } : {},
    },
  )
}

/** Jeder Zugriff wird mitgeschrieben – auch die abgelehnten. */
export async function protokolliere(input: {
  householdId: string
  tokenId?: string | null
  method: string
  path: string
  status: number
  detail?: string
}): Promise<void> {
  try {
    await prisma.apiAuditLog.create({
      data: {
        householdId: input.householdId,
        tokenId: input.tokenId ?? null,
        method: input.method,
        path: input.path,
        status: input.status,
        detail: input.detail?.slice(0, 300) ?? null,
      },
    })
  } catch {
    // Das Protokoll darf die Antwort nie verhindern.
  }
}
