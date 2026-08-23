import 'server-only'
import { prisma } from '@/lib/db'

/**
 * Ausgehende Webhooks bei neuen Ereignissen.
 *
 * Drei Versuche mit wachsendem Abstand, danach bleibt der Fehler am Webhook
 * stehen und ist in den Einstellungen sichtbar. Ein Webhook, der still
 * scheitert, ist schlimmer als keiner: man verlaesst sich darauf.
 */
export const VERSUCHE = 3
export const BACKOFF_MS = [0, 1_000, 4_000]
const TIMEOUT_MS = 5_000

export type WebhookNachricht = {
  art: string
  type: string
  eventId: string
  childId: string
  at: string
  quelle: string
}

/** Passt der Ereignistyp zum Filter? Leere Liste heisst: alles. */
export function passtZumFilter(filter: unknown, type: string): boolean {
  if (!Array.isArray(filter) || filter.length === 0) return true
  return filter.some((eintrag) => typeof eintrag === 'string' && eintrag === type)
}

async function sende(url: string, nachricht: WebhookNachricht): Promise<void> {
  for (let versuch = 0; versuch < VERSUCHE; versuch += 1) {
    if (BACKOFF_MS[versuch]) {
      await new Promise((resolve) => setTimeout(resolve, BACKOFF_MS[versuch]))
    }
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'Sproessling' },
        body: JSON.stringify(nachricht),
        signal: controller.signal,
      })
      clearTimeout(timer)
      if (response.ok) return
      if (versuch === VERSUCHE - 1) {
        throw new Error(`Server antwortete mit ${response.status}`)
      }
    } catch (error) {
      clearTimeout(timer)
      if (versuch === VERSUCHE - 1) throw error
    }
  }
}

/**
 * Verschickt die Nachricht an alle passenden Webhooks des Haushalts. Fehler
 * landen am Webhook und nicht in der Antwort an die Automation – das Ereignis
 * ist gespeichert, egal ob der Webhook ankam.
 */
export async function sendeWebhooks(
  householdId: string,
  nachricht: WebhookNachricht,
): Promise<void> {
  const webhooks = await prisma.webhook.findMany({ where: { householdId, active: true } })

  await Promise.all(
    webhooks
      .filter((webhook) => passtZumFilter(webhook.eventTypes, nachricht.type))
      .map(async (webhook) => {
        try {
          await sende(webhook.url, nachricht)
          await prisma.webhook.update({
            where: { id: webhook.id },
            data: { lastSentAt: new Date(), lastError: null, failures: 0 },
          })
        } catch (error) {
          await prisma.webhook.update({
            where: { id: webhook.id },
            data: {
              lastError: (error instanceof Error ? error.message : 'Unbekannter Fehler').slice(0, 300),
              failures: { increment: 1 },
            },
          })
        }
      }),
  )
}
