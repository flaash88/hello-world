/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import 'fake-indexeddb/auto'
import { enqueue, failed, pending, remove, type QueuedOperation } from './queue'
import { flushQueue } from './sync'

function operation(clientId: string): QueuedOperation {
  return {
    op: 'create',
    clientId,
    childId: 'child-1',
    type: 'diaper',
    startedAt: '2026-11-15T08:00:00.000Z',
    payload: { kind: 'wet' },
    queuedAt: `2026-11-15T08:00:${clientId.padStart(2, '0')}.000Z`,
  }
}

function mockFetch(handler: (body: { operations: QueuedOperation[] }) => unknown) {
  return vi.fn(async (_url: string, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body ?? '{}'))
    const result = handler(body)
    return {
      ok: true,
      status: 200,
      json: async () => result,
    } as Response
  })
}

describe('flushQueue', () => {
  beforeEach(async () => {
    document.cookie = 'sp_csrf=test-token'
    for (const entry of [...(await pending()), ...(await failed())]) {
      await remove(entry.clientId)
    }
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('macht nichts bei leerer Queue', async () => {
    const fetchMock = mockFetch(() => ({ results: [] }))
    vi.stubGlobal('fetch', fetchMock)
    const summary = await flushQueue()
    expect(summary).toEqual({ applied: 0, duplicate: 0, failed: 0, remaining: 0 })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('schickt Operationen und leert die Queue', async () => {
    await enqueue(operation('1'))
    await enqueue(operation('2'))

    const fetchMock = mockFetch((body) => ({
      results: body.operations.map((op) => ({ clientId: op.clientId, status: 'applied' })),
    }))
    vi.stubGlobal('fetch', fetchMock)

    const summary = await flushQueue()
    expect(summary.applied).toBe(2)
    expect(summary.remaining).toBe(0)
    expect(await pending()).toHaveLength(0)
  })

  it('schickt das CSRF-Token mit', async () => {
    await enqueue(operation('1'))
    const fetchMock = mockFetch((body) => ({
      results: body.operations.map((op) => ({ clientId: op.clientId, status: 'applied' })),
    }))
    vi.stubGlobal('fetch', fetchMock)

    await flushQueue()
    const init = fetchMock.mock.calls[0]![1] as RequestInit
    expect((init.headers as Record<string, string>)['x-csrf-token']).toBe('test-token')
  })

  it('behaelt die Reihenfolge der Entstehung bei', async () => {
    await enqueue(operation('2'))
    await enqueue(operation('1'))

    let seen: string[] = []
    const fetchMock = mockFetch((body) => {
      seen = body.operations.map((op) => op.clientId)
      return { results: body.operations.map((op) => ({ clientId: op.clientId, status: 'applied' })) }
    })
    vi.stubGlobal('fetch', fetchMock)

    await flushQueue()
    expect(seen).toEqual(['1', '2'])
  })

  it('zaehlt Duplikate getrennt und entfernt sie ebenfalls', async () => {
    await enqueue(operation('1'))
    vi.stubGlobal(
      'fetch',
      mockFetch((body) => ({
        results: body.operations.map((op) => ({ clientId: op.clientId, status: 'duplicate' })),
      })),
    )

    const summary = await flushQueue()
    expect(summary.duplicate).toBe(1)
    expect(await pending()).toHaveLength(0)
  })

  it('behaelt gescheiterte Operationen in der Queue', async () => {
    await enqueue(operation('1'))
    vi.stubGlobal(
      'fetch',
      mockFetch((body) => ({
        results: body.operations.map((op) => ({
          clientId: op.clientId,
          status: 'failed',
          error: 'Eingabe ungültig.',
        })),
      })),
    )

    const summary = await flushQueue()
    expect(summary.failed).toBe(1)
    const remaining = await pending()
    expect(remaining).toHaveLength(1)
    expect(remaining[0]!.attempts).toBe(1)
    expect(remaining[0]!.lastError).toBe('Eingabe ungültig.')
  })

  it('verliert bei einem Netzwerkfehler nichts', async () => {
    await enqueue(operation('1'))
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('Netzwerk weg')
      }),
    )

    const summary = await flushQueue()
    expect(summary.applied).toBe(0)
    expect(await pending()).toHaveLength(1)
  })

  it('behandelt einen Serverfehler wie einen Netzwerkfehler', async () => {
    await enqueue(operation('1'))
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) }) as Response),
    )

    await flushQueue()
    expect(await pending()).toHaveLength(1)
  })

  it('sendet die interne Buchhaltung nicht mit', async () => {
    await enqueue(operation('1'))
    let payload: Record<string, unknown> = {}
    vi.stubGlobal(
      'fetch',
      mockFetch((body) => {
        payload = body.operations[0] as unknown as Record<string, unknown>
        return { results: body.operations.map((op) => ({ clientId: op.clientId, status: 'applied' })) }
      }),
    )

    await flushQueue()
    expect(payload).not.toHaveProperty('attempts')
    expect(payload).not.toHaveProperty('lastError')
  })
})
