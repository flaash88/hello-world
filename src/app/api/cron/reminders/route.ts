import { runReminders } from '@/lib/push/reminders'
import { safeEqual } from '@/lib/auth/tokens'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Wird vom Cron-Sidecar alle fuenf Minuten aufgerufen. Geschuetzt mit einem
 * gemeinsamen Geheimnis, weil der Endpunkt keine Session hat.
 */
export async function POST(request: Request): Promise<Response> {
  const expected = process.env.CRON_SECRET
  if (!expected) {
    return Response.json({ error: 'CRON_SECRET ist nicht gesetzt.' }, { status: 503 })
  }
  const provided = request.headers.get('x-cron-secret') ?? ''
  if (!safeEqual(provided, expected)) {
    return Response.json({ error: 'Nicht berechtigt' }, { status: 401 })
  }

  const result = await runReminders()
  return Response.json(result)
}
