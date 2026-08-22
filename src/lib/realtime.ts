import 'server-only'
import { Client } from 'pg'
import { prisma } from '@/lib/db'

export const REALTIME_CHANNEL = 'sproessling_events'

export type RealtimePayload = {
  channel: string
  householdId: string
  childId?: string | null
  kind: string
  id?: string
  at: string
}

/**
 * Aenderungen werden ueber Postgres NOTIFY verteilt. Das haelt die App ohne
 * zusaetzlichen Broker (Redis o.ae.) mehrprozessfaehig – wichtig, weil der
 * Next-Server im Container mehrere Worker haben kann.
 */
export async function publish(payload: Omit<RealtimePayload, 'at'>): Promise<void> {
  const message = JSON.stringify({ ...payload, at: new Date().toISOString() })
  // pg_notify statt NOTIFY, weil der Payload so parametrisiert werden kann.
  await prisma.$executeRawUnsafe('SELECT pg_notify($1, $2)', REALTIME_CHANNEL, message)
}

type Subscriber = (payload: RealtimePayload) => void

class NotifyHub {
  private client: Client | null = null
  private connecting: Promise<void> | null = null
  private subscribers = new Set<Subscriber>()

  async subscribe(fn: Subscriber): Promise<() => void> {
    this.subscribers.add(fn)
    await this.ensureConnected()
    return () => {
      this.subscribers.delete(fn)
    }
  }

  private async ensureConnected(): Promise<void> {
    if (this.client) return
    if (this.connecting) return this.connecting

    this.connecting = (async () => {
      const client = new Client({ connectionString: process.env.DATABASE_URL })
      client.on('notification', (msg) => {
        if (!msg.payload) return
        try {
          const payload = JSON.parse(msg.payload) as RealtimePayload
          this.subscribers.forEach((fn) => fn(payload))
        } catch {
          // Fehlerhafte Payloads still verwerfen.
        }
      })
      client.on('error', () => {
        this.client = null
        this.connecting = null
      })
      await client.connect()
      await client.query(`LISTEN ${REALTIME_CHANNEL}`)
      this.client = client
    })()

    try {
      await this.connecting
    } finally {
      this.connecting = null
    }
  }
}

const globalForHub = globalThis as unknown as { notifyHub?: NotifyHub }
export const notifyHub = globalForHub.notifyHub ?? new NotifyHub()
if (process.env.NODE_ENV !== 'production') globalForHub.notifyHub = notifyHub
