'use client'
import {
  markGeteiltFailed,
  markAudioFailed,
  markFailed,
  pending,
  pendingAudio,
  remove,
  removeAudio,
  pendingGeteilt,
  removeGeteilt,
  type QueueEntry,
} from './queue'

export type SyncSummary = {
  applied: number
  duplicate: number
  failed: number
  remaining: number
  /** Hochgeladene Aufnahmen aus dem Tonspur-Tagebuch. */
  audioApplied: number
  /** Offline geteilte Dateien, die jetzt durchgegangen sind. */
  sharedApplied: number
}

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
  if (running) {
    return {
      applied: 0,
      duplicate: 0,
      failed: 0,
      audioApplied: 0,
      sharedApplied: 0,
      remaining: await countRemaining(),
    }
  }
  running = true
  try {
    const summary: SyncSummary = {
      applied: 0,
      duplicate: 0,
      failed: 0,
      audioApplied: 0,
      sharedApplied: 0,
      remaining: 0,
    }
    summary.audioApplied = await flushAudio()
    summary.sharedApplied = await flushGeteilt()

    const entries = await pending()
    if (entries.length === 0) {
      summary.remaining = await countRemaining()
      return summary
    }

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
  const [operationen, aufnahmen, geteilt] = await Promise.all([
    pending(),
    pendingAudio(),
    pendingGeteilt(),
  ])
  return operationen.length + aufnahmen.length + geteilt.length
}

/**
 * Dateien, die offline ueber "Teilen" hereinkamen. Der Service Worker hat sie
 * abgelegt, hier gehen sie denselben Weg wie ein Teilen mit Verbindung.
 */
async function flushGeteilt(): Promise<number> {
  const entries = await pendingGeteilt()
  let gesendet = 0

  for (const entry of entries) {
    const form = new FormData()
    if (entry.titel) form.set('title', entry.titel)
    form.set('media', new Blob([entry.bytes], { type: entry.mimeType }), entry.name)

    try {
      const response = await fetch('/api/share', {
        method: 'POST',
        headers: { 'x-csrf-token': csrfToken() },
        body: form,
        redirect: 'manual',
      })
      // Der Endpunkt antwortet mit einem Redirect; alles ausser 5xx heisst
      // "angekommen".
      if (response.status < 500) {
        await removeGeteilt(entry.clientId)
        gesendet += 1
        continue
      }
      await markGeteiltFailed(entry.clientId, `Server antwortete mit ${response.status}`)
    } catch (error) {
      await markGeteiltFailed(
        entry.clientId,
        error instanceof Error ? error.message : 'Netzwerkfehler',
      )
    }
  }

  return gesendet
}

/**
 * Aufnahmen gehen einzeln als Multipart raus – ein Stapel waere ein Request
 * von mehreren Megabyte, und genau der geht unterwegs schief. Die `clientId`
 * sorgt dafuer, dass ein zweiter Versuch nichts doppelt anlegt.
 */
async function flushAudio(): Promise<number> {
  const entries = await pendingAudio()
  let hochgeladen = 0

  for (const entry of entries) {
    const form = new FormData()
    form.set('clientId', entry.clientId)
    form.set('childId', entry.childId)
    form.set('title', entry.title)
    form.set('recordedAt', entry.recordedAt)
    form.set('tags', JSON.stringify(entry.tags))
    if (entry.milestoneId) form.set('milestoneId', entry.milestoneId)
    form.set('file', new Blob([entry.bytes], { type: entry.mimeType }), entry.clientId)

    try {
      const response = await fetch('/api/audio', {
        method: 'POST',
        headers: { 'x-csrf-token': csrfToken() },
        body: form,
      })
      if (response.ok) {
        await removeAudio(entry.clientId)
        hochgeladen += 1
        continue
      }
      // 4xx heisst: der Server nimmt diese Aufnahme nie an. Weiter zu
      // versuchen, waere nur Datenverbrauch.
      const data = (await response.json().catch(() => ({}))) as { error?: string }
      const fehler = data.error ?? `Server antwortete mit ${response.status}`
      await markAudioFailed(entry.clientId, fehler, {
        endgueltig: response.status >= 400 && response.status < 500,
      })
    } catch (error) {
      await markAudioFailed(
        entry.clientId,
        error instanceof Error ? error.message : 'Netzwerkfehler',
      )
    }
  }

  return hochgeladen
}
