import 'server-only'
import { cookies } from 'next/headers'
import { CSRF_COOKIE } from './session'
import { safeEqual } from './tokens'

export const CSRF_HEADER = 'x-csrf-token'

/**
 * Double-Submit-Cookie. Server Actions bringen bereits einen eigenen
 * Origin-Check mit; fuer die Route Handler (Offline-Queue, Timer) pruefen wir
 * zusaetzlich explizit.
 */
export async function assertCsrf(request: Request): Promise<void> {
  const store = await cookies()
  const cookieToken = store.get(CSRF_COOKIE)?.value
  const headerToken = request.headers.get(CSRF_HEADER)
  if (!cookieToken || !headerToken || !safeEqual(cookieToken, headerToken)) {
    throw new CsrfError()
  }
}

export class CsrfError extends Error {
  constructor() {
    super('Ungueltiges CSRF-Token')
    this.name = 'CsrfError'
  }
}
