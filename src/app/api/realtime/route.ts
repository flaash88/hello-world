import { getCurrentUser } from '@/lib/auth/session'
import { notifyHub, type RealtimePayload } from '@/lib/realtime'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const PING_INTERVAL_MS = 25_000

/**
 * SSE-Strom aller Aenderungen im eigenen Haushalt. Der Ping haelt die
 * Verbindung durch den Cloudflare Tunnel offen (Idle-Timeout ~100 s).
 */
export async function GET(request: Request): Promise<Response> {
  const user = await getCurrentUser()
  if (!user) return new Response('Nicht angemeldet', { status: 401 })

  const encoder = new TextEncoder()
  let unsubscribe: (() => void) | undefined
  let ping: ReturnType<typeof setInterval> | undefined

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (data: unknown) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        } catch {
          // Client ist weg – der abort-Handler raeumt auf.
        }
      }

      send({ kind: 'ready', at: new Date().toISOString() })

      unsubscribe = await notifyHub.subscribe((payload: RealtimePayload) => {
        if (payload.householdId !== user.householdId) return
        send(payload)
      })

      ping = setInterval(() => send({ kind: 'ping', at: new Date().toISOString() }), PING_INTERVAL_MS)

      request.signal.addEventListener('abort', () => {
        clearInterval(ping)
        unsubscribe?.()
        try {
          controller.close()
        } catch {
          // Bereits geschlossen.
        }
      })
    },
    cancel() {
      clearInterval(ping)
      unsubscribe?.()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
