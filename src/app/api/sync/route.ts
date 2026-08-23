import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth/session'
import { assertCsrf, CsrfError } from '@/lib/auth/csrf'
import { prisma } from '@/lib/db'
import {
  createEvent,
  deleteEvent,
  stopTimer,
  updateEvent,
} from '@/lib/events/service'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Sammelendpunkt der Offline-Queue.
 *
 * Der Client schickt seine gepufferten Schreibvorgaenge in der Reihenfolge, in
 * der sie entstanden sind. Jeder Eintrag traegt eine `clientId` – dadurch ist
 * ein erneutes Senden folgenlos, wenn die Antwort unterwegs verloren ging.
 *
 * Konflikte werden auf Feldebene mit Last-Write-Wins aufgeloest: Die Queue
 * schickt nur die tatsaechlich geaenderten Felder, und der zuletzt
 * eintreffende Schreibvorgang gewinnt fuer genau diese Felder.
 */
const operationSchema = z.discriminatedUnion('op', [
  z.object({
    op: z.literal('create'),
    clientId: z.string().min(1).max(64),
    childId: z.string().min(1),
    type: z.string().min(1),
    startedAt: z.string(),
    endedAt: z.string().nullable().optional(),
    payload: z.unknown().optional(),
    note: z.string().max(2000).optional(),
    queuedAt: z.string(),
  }),
  z.object({
    op: z.literal('update'),
    clientId: z.string().min(1).max(64),
    eventId: z.string().min(1),
    startedAt: z.string().optional(),
    endedAt: z.string().nullable().optional(),
    payload: z.unknown().optional(),
    note: z.string().max(2000).nullable().optional(),
    queuedAt: z.string(),
  }),
  z.object({
    op: z.literal('delete'),
    clientId: z.string().min(1).max(64),
    eventId: z.string().min(1),
    queuedAt: z.string(),
  }),
  z.object({
    op: z.literal('stop'),
    clientId: z.string().min(1).max(64),
    eventId: z.string().min(1),
    endedAt: z.string(),
    payload: z.unknown().optional(),
    queuedAt: z.string(),
  }),
])

const bodySchema = z.object({ operations: z.array(operationSchema).max(200) })

export type SyncOperation = z.infer<typeof operationSchema>
export type SyncOutcome = {
  clientId: string
  status: 'applied' | 'duplicate' | 'failed'
  eventId?: string
  error?: string
}

export async function POST(request: Request): Promise<Response> {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Nicht angemeldet' }, { status: 401 })

  try {
    await assertCsrf(request)
  } catch (error) {
    if (error instanceof CsrfError) return Response.json({ error: error.message }, { status: 403 })
    throw error
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return Response.json({ error: 'Ungültige Anfrage.' }, { status: 400 })
  }

  const ctx = { userId: user.id, householdId: user.householdId }
  const results: SyncOutcome[] = []

  for (const operation of parsed.data.operations) {
    try {
      switch (operation.op) {
        case 'create': {
          const result = await createEvent(ctx, {
            childId: operation.childId,
            type: operation.type,
            startedAt: operation.startedAt,
            endedAt: operation.endedAt ?? null,
            payload: operation.payload,
            note: operation.note,
            clientId: operation.clientId,
          })
          results.push(
            result.ok
              ? {
                  clientId: operation.clientId,
                  status: result.data.created ? 'applied' : 'duplicate',
                  eventId: result.data.id,
                }
              : { clientId: operation.clientId, status: 'failed', error: result.error },
          )
          break
        }
        case 'update': {
          const result = await updateEvent(ctx, operation.eventId, {
            startedAt: operation.startedAt,
            endedAt: operation.endedAt,
            payload: operation.payload,
            note: operation.note,
          })
          results.push(
            result.ok
              ? { clientId: operation.clientId, status: 'applied', eventId: result.data.id }
              : { clientId: operation.clientId, status: 'failed', error: result.error },
          )
          break
        }
        case 'delete': {
          const result = await deleteEvent(ctx, operation.eventId)
          // Ein bereits geloeschter Eintrag ist kein Fehler, sondern erledigt.
          if (!result.ok) {
            const gone = await prisma.event.findFirst({
              where: { id: operation.eventId, deletedAt: { not: null } },
              select: { id: true },
            })
            results.push(
              gone
                ? { clientId: operation.clientId, status: 'duplicate', eventId: gone.id }
                : { clientId: operation.clientId, status: 'failed', error: result.error },
            )
          } else {
            results.push({ clientId: operation.clientId, status: 'applied', eventId: result.data.id })
          }
          break
        }
        case 'stop': {
          const result = await stopTimer(ctx, operation.eventId, operation.payload, operation.endedAt)
          if (!result.ok) {
            const stopped = await prisma.event.findFirst({
              where: { id: operation.eventId, running: false },
              select: { id: true },
            })
            results.push(
              stopped
                ? { clientId: operation.clientId, status: 'duplicate', eventId: stopped.id }
                : { clientId: operation.clientId, status: 'failed', error: result.error },
            )
          } else {
            results.push({ clientId: operation.clientId, status: 'applied', eventId: result.data.id })
          }
          break
        }
      }
    } catch (error) {
      results.push({
        clientId: operation.clientId,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unbekannter Fehler',
      })
    }
  }

  return Response.json({ results })
}
