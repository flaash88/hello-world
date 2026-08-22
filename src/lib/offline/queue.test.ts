/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import 'fake-indexeddb/auto'
import {
  clearFailed,
  countPending,
  enqueue,
  failed,
  markFailed,
  MAX_ATTEMPTS,
  newClientId,
  pending,
  remove,
} from './queue'

function operation(clientId: string, queuedAt = new Date().toISOString()) {
  return {
    op: 'create' as const,
    clientId,
    childId: 'child-1',
    type: 'diaper',
    startedAt: queuedAt,
    payload: { kind: 'wet' },
    queuedAt,
  }
}

describe('Offline-Queue', () => {
  beforeEach(async () => {
    for (const entry of [...(await pending()), ...(await failed())]) {
      await remove(entry.clientId)
    }
  })

  it('speichert und liest Operationen', async () => {
    await enqueue(operation('a'))
    await enqueue(operation('b'))
    expect(await countPending()).toBe(2)
  })

  it('behaelt die Reihenfolge der Entstehung', async () => {
    await enqueue(operation('spaeter', '2026-01-02T10:00:00.000Z'))
    await enqueue(operation('frueher', '2026-01-01T10:00:00.000Z'))
    const entries = await pending()
    expect(entries.map((e) => e.clientId)).toEqual(['frueher', 'spaeter'])
  })

  it('ueberschreibt bei gleicher clientId statt zu duplizieren', async () => {
    await enqueue(operation('gleich'))
    await enqueue(operation('gleich'))
    expect(await countPending()).toBe(1)
  })

  it('zaehlt Fehlversuche und nimmt Eintraege irgendwann aus der Warteschlange', async () => {
    await enqueue(operation('kaputt'))
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      await markFailed('kaputt', 'Serverfehler')
    }
    expect(await countPending()).toBe(0)
    const broken = await failed()
    expect(broken).toHaveLength(1)
    expect(broken[0]!.lastError).toBe('Serverfehler')
  })

  it('verwirft dauerhaft gescheiterte Eintraege auf Wunsch', async () => {
    await enqueue(operation('kaputt2'))
    for (let i = 0; i < MAX_ATTEMPTS; i++) await markFailed('kaputt2', 'Fehler')
    expect(await clearFailed()).toBe(1)
    expect(await failed()).toHaveLength(0)
  })

  it('entfernt uebertragene Eintraege', async () => {
    await enqueue(operation('fertig'))
    await remove('fertig')
    expect(await countPending()).toBe(0)
  })

  it('erzeugt eindeutige Schluessel', () => {
    const ids = new Set(Array.from({ length: 200 }, () => newClientId()))
    expect(ids.size).toBe(200)
  })

  it('ignoriert markFailed fuer unbekannte Schluessel', async () => {
    await expect(markFailed('gibt-es-nicht', 'x')).resolves.toBeUndefined()
  })
})

describe('newClientId ohne crypto.randomUUID', () => {
  it('faellt auf einen Ersatz zurueck', () => {
    const original = globalThis.crypto.randomUUID
    // @ts-expect-error – Testaufbau: aeltere Browser haben randomUUID nicht.
    globalThis.crypto.randomUUID = undefined
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.5)
    expect(newClientId()).toMatch(/^\d+-/)
    spy.mockRestore()
    globalThis.crypto.randomUUID = original
  })
})
