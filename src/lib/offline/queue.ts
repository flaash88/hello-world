'use client'
import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

/**
 * Schreib-Queue in IndexedDB.
 *
 * Jede schreibende Aktion landet zuerst hier und wird dann an /api/sync
 * geschickt. Geht das schief (offline, Serverfehler), bleibt der Eintrag in
 * der Queue und wird beim naechsten Reconnect erneut versucht. Die `clientId`
 * macht das Wiederholen ungefaehrlich.
 */

export type QueuedOperation =
  | {
      op: 'create'
      clientId: string
      childId: string
      type: string
      startedAt: string
      endedAt?: string | null
      payload?: unknown
      note?: string
      queuedAt: string
    }
  | {
      op: 'update'
      clientId: string
      eventId: string
      startedAt?: string
      endedAt?: string | null
      payload?: unknown
      note?: string | null
      queuedAt: string
    }
  | { op: 'delete'; clientId: string; eventId: string; queuedAt: string }
  | {
      op: 'stop'
      clientId: string
      eventId: string
      endedAt: string
      payload?: unknown
      queuedAt: string
    }

export type QueueEntry = QueuedOperation & { attempts: number; lastError?: string }

/**
 * Aufnahmen aus dem Tonspur-Tagebuch. Sie koennen nicht in denselben Speicher
 * wie die Events: dort liegt JSON, hier ein Blob, und verschickt wird er als
 * Multipart statt im Stapel. Dieselbe Datenbank, derselbe Flush-Lauf.
 */
export type QueuedAudio = {
  clientId: string
  childId: string
  title: string
  recordedAt: string
  tags: string[]
  milestoneId: string | null
  /**
   * Die Aufnahme als Rohdaten, nicht als Blob: Blobs in IndexedDB sind je nach
   * Browser heikel, ein ArrayBuffer ist es nirgends. Der Blob entsteht erst
   * beim Hochladen wieder.
   */
  bytes: ArrayBuffer
  mimeType: string
  queuedAt: string
}

export type AudioEntry = QueuedAudio & { attempts: number; lastError?: string }

/**
 * Gespiegelte Notfallkarte. Liegt bewusst in derselben Datenbank wie die
 * Queue: eine Datenbank, ein Upgrade-Pfad, und beim Abmelden ist alles an
 * einem Ort.
 */
export type NotfallSpiegel = { key: 'aktuell'; karte: unknown; gespiegeltAm: string }

/**
 * Ueber "Teilen" hereingereichte Dateien, die offline ankamen. Der Service
 * Worker legt sie hier ab, der naechste Flush-Lauf schickt sie an /api/share.
 */
export type GeteilteDatei = {
  clientId: string
  bytes: ArrayBuffer
  mimeType: string
  name: string
  titel: string
  queuedAt: string
  attempts: number
  lastError?: string
}

interface QueueDb extends DBSchema {
  operations: { key: string; value: QueueEntry; indexes: { queuedAt: string } }
  audio: { key: string; value: AudioEntry; indexes: { queuedAt: string } }
  notfall: { key: string; value: NotfallSpiegel }
  geteilt: { key: string; value: GeteilteDatei; indexes: { queuedAt: string } }
}

const DB_NAME = 'sproessling'
const DB_VERSION = 4
const STORE = 'operations'
const AUDIO_STORE = 'audio'
const NOTFALL_STORE = 'notfall'
export const GETEILT_STORE = 'geteilt'
/** Nach so vielen Fehlversuchen gilt ein Eintrag als dauerhaft kaputt. */
export const MAX_ATTEMPTS = 8

let dbPromise: Promise<IDBPDatabase<QueueDb>> | null = null

function db(): Promise<IDBPDatabase<QueueDb>> {
  dbPromise ??= openDB<QueueDb>(DB_NAME, DB_VERSION, {
    upgrade(database, alteVersion) {
      if (alteVersion < 1) {
        const store = database.createObjectStore(STORE, { keyPath: 'clientId' })
        store.createIndex('queuedAt', 'queuedAt')
      }
      if (alteVersion < 2) {
        const store = database.createObjectStore(AUDIO_STORE, { keyPath: 'clientId' })
        store.createIndex('queuedAt', 'queuedAt')
      }
      if (alteVersion < 3) {
        database.createObjectStore(NOTFALL_STORE, { keyPath: 'key' })
      }
      if (alteVersion < 4) {
        const store = database.createObjectStore(GETEILT_STORE, { keyPath: 'clientId' })
        store.createIndex('queuedAt', 'queuedAt')
      }
    },
  })
  return dbPromise
}

export function newClientId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export async function enqueue(operation: QueuedOperation): Promise<void> {
  const database = await db()
  await database.put(STORE, { ...operation, attempts: 0 })
}

export async function pending(): Promise<QueueEntry[]> {
  const database = await db()
  const all = await database.getAllFromIndex(STORE, 'queuedAt')
  return all.filter((entry) => entry.attempts < MAX_ATTEMPTS)
}

export async function failed(): Promise<QueueEntry[]> {
  const database = await db()
  const all = await database.getAll(STORE)
  return all.filter((entry) => entry.attempts >= MAX_ATTEMPTS)
}

export async function countPending(): Promise<number> {
  return (await pending()).length
}

export async function remove(clientId: string): Promise<void> {
  const database = await db()
  await database.delete(STORE, clientId)
}

export async function markFailed(clientId: string, error: string): Promise<void> {
  const database = await db()
  const entry = await database.get(STORE, clientId)
  if (!entry) return
  await database.put(STORE, { ...entry, attempts: entry.attempts + 1, lastError: error })
}

export async function clearFailed(): Promise<number> {
  const database = await db()
  const broken = await failed()
  await Promise.all(broken.map((entry) => database.delete(STORE, entry.clientId)))
  const brokenAudio = await failedAudio()
  await Promise.all(brokenAudio.map((entry) => database.delete(AUDIO_STORE, entry.clientId)))
  return broken.length + brokenAudio.length
}

// ------------------------------------------------------------- Aufnahmen --

export async function enqueueAudio(entry: QueuedAudio): Promise<void> {
  const database = await db()
  await database.put(AUDIO_STORE, { ...entry, attempts: 0 })
}

export async function pendingAudio(): Promise<AudioEntry[]> {
  const database = await db()
  const all = await database.getAllFromIndex(AUDIO_STORE, 'queuedAt')
  return all.filter((entry) => entry.attempts < MAX_ATTEMPTS)
}

export async function removeAudio(clientId: string): Promise<void> {
  const database = await db()
  await database.delete(AUDIO_STORE, clientId)
}

/**
 * Zaehlt einen Fehlversuch. `endgueltig` ist fuer Antworten, die sich beim
 * naechsten Mal nicht aendern (zu gross, kein Kind, kaputte Datei) – dann
 * hoert die App auf, es zu versuchen, statt Datenvolumen zu verbrennen.
 */
export async function markAudioFailed(
  clientId: string,
  error: string,
  opts: { endgueltig?: boolean } = {},
): Promise<void> {
  const database = await db()
  const entry = await database.get(AUDIO_STORE, clientId)
  if (!entry) return
  await database.put(AUDIO_STORE, {
    ...entry,
    attempts: opts.endgueltig ? MAX_ATTEMPTS : entry.attempts + 1,
    lastError: error,
  })
}

export async function failedAudio(): Promise<AudioEntry[]> {
  const database = await db()
  const all = await database.getAll(AUDIO_STORE)
  return all.filter((entry) => entry.attempts >= MAX_ATTEMPTS)
}

export async function countPendingAudio(): Promise<number> {
  return (await pendingAudio()).length
}

// --------------------------------------------------------- Notfallkarte --

export async function spiegleNotfallKarte(karte: unknown): Promise<void> {
  const database = await db()
  await database.put(NOTFALL_STORE, {
    key: 'aktuell',
    karte,
    gespiegeltAm: new Date().toISOString(),
  })
}

export async function gespiegelteNotfallKarte(): Promise<NotfallSpiegel | null> {
  const database = await db()
  return (await database.get(NOTFALL_STORE, 'aktuell')) ?? null
}

/**
 * Die gespiegelte Karte wegwerfen.
 *
 * Noetig, sobald der Server sagt, dass es das Kind nicht mehr gibt. Eine
 * Notfallkarte, die Gewicht, Allergien und Geburtsdatum eines geloeschten
 * Kindes zeigt, ist schlimmer als gar keine – im Notfall liest jemand daraus
 * vor.
 */
export async function loescheNotfallSpiegel(): Promise<void> {
  const database = await db()
  await database.delete(NOTFALL_STORE, 'aktuell')
}

// ---------------------------------------------------- Geteilte Dateien --

export async function pendingGeteilt(): Promise<GeteilteDatei[]> {
  const database = await db()
  const all = await database.getAllFromIndex(GETEILT_STORE, 'queuedAt')
  return all.filter((entry) => entry.attempts < MAX_ATTEMPTS)
}

export async function removeGeteilt(clientId: string): Promise<void> {
  const database = await db()
  await database.delete(GETEILT_STORE, clientId)
}

export async function markGeteiltFailed(
  clientId: string,
  error: string,
  opts: { endgueltig?: boolean } = {},
): Promise<void> {
  const database = await db()
  const entry = await database.get(GETEILT_STORE, clientId)
  if (!entry) return
  await database.put(GETEILT_STORE, {
    ...entry,
    attempts: opts.endgueltig ? MAX_ATTEMPTS : entry.attempts + 1,
    lastError: error,
  })
}
