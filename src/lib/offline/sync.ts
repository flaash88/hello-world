'use client'
import { markFailed, pending, remove, type QueueEntry } from './queue'

export type SyncSummary = { applied: number; duplicate: number; failed: number; remaining: number }

type SyncOutcome = {
  clientId: string
  status: 'applied' | 'duplicate' | 'failed'
  eventId?: string
  error?: string
}

function csrfToken(): string {
  const match = document.cookie.match(/(?:^|;\s*)sp_csrf=([^;]+)/)
  return match?.[1] ? decodeURIComponent(match[1]) : ''
}

/** Schickt einen Stapel Operationen. Reihenfolge = Entstehungsreihenfolge. */
async function send(entries: QueueEntry[]): Promise<SyncOutcome[]> {
  const response = await fetch('/api/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken() },
    body: JSON.stringify({
      operations: entries.map(({ attempts: _attempts, lastError: _lastError, ...operation }) => operation),
    }),
  })
  if (!response.ok) {
    throw new Error(`Server antwortete mit ${response.status}`)
  }
  const data = (await response.json()) as { results?: SyncOutcome[] }
  return data.results ?? []
}

/**
 * Arbeitet die Queue ab. Wird bei Reconnect, beim Laden und nach jeder
 * Schreibaktion aufgerufen. Mehrfachaufrufe sind ungefaehrlich – die Sperre
 * verhindert parallele Laeufe.
 */
let running = false

export async function flushQueue(): Promise<SyncSummary> {
  if (running) return { applied: 0, duplicate: 0, failed: 0, remaining: await countRemaining() }
  running = true
  try {
    const entries = await pending()
    if (entries.length === 0) return { applied: 0, duplicate: 0, failed: 0, remaining: 0 }

    const summary: SyncSummary = { applied: 0, duplicate: 0, failed: 0, remaining: 0 }

    // In Stapeln zu 50, damit ein langer Offline-Zeitraum nicht in einen
    // einzigen riesigen Request muendet.
    for (let i = 0; i < entries.length; i += 50) {
      const batch = entries.slice(i, i + 50)
      let outcomes: SyncOutcome[]
      try {
        outcomes = await send(batch)
      } catch (error) {
        // Netzwerkfehler: nichts als endgueltig gescheitert markieren.
        const message = error instanceof Error ? error.message : 'Netzwerkfehler'
        for (const entry of batch) await markFailed(entry.clientId, message)
        summary.failed += batch.length
        break
      }

      for (const outcome of outcomes) {
        if (outcome.status === 'failed') {
          await markFailed(outcome.clientId, outcome.error ?? 'Unbekannter Fehler')
          summary.failed += 1
        } else {
          await remove(outcome.clientId)
          if (outcome.status === 'applied') summary.applied += 1
          else summary.duplicate += 1
        }
      }
    }

    summary.remaining = await countRemaining()
    return summary
  } finally {
    running = false
  }
}

async function countRemaining(): Promise<number> {
  return (await pending()).length
}
