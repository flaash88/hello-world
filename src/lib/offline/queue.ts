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

interface QueueDb extends DBSchema {
  operations: { key: string; value: QueueEntry; indexes: { queuedAt: string } }
}

const DB_NAME = 'sproessling'
const DB_VERSION = 1
const STORE = 'operations'
/** Nach so vielen Fehlversuchen gilt ein Eintrag als dauerhaft kaputt. */
export const MAX_ATTEMPTS = 8

let dbPromise: Promise<IDBPDatabase<QueueDb>> | null = null

function db(): Promise<IDBPDatabase<QueueDb>> {
  dbPromise ??= openDB<QueueDb>(DB_NAME, DB_VERSION, {
    upgrade(database) {
      const store = database.createObjectStore(STORE, { keyPath: 'clientId' })
      store.createIndex('queuedAt', 'queuedAt')
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
  return broken.length
}
