import 'server-only'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { publish } from '@/lib/realtime'
import { planeIntervallErinnerung } from '@/lib/fever/reminder'
import { pruefeDuplikat, type DuplikatHinweis } from './duplicate-service'
import { eventInputSchema, parsePayload } from './schemas'
import { EVENT_CATEGORIES, type EventType } from './types'

export type ServiceContext = { userId: string; householdId: string }
export type ServiceResult<T> = { ok: true; data: T } | { ok: false; error: string }

/** Sekundendauer eines abgeschlossenen Zeitraums, abzueglich Pausen. */
function durationOf(startedAt: Date, endedAt: Date | null, pausedSec: number): number | null {
  if (!endedAt) return null
  return Math.max(0, Math.round((endedAt.getTime() - startedAt.getTime()) / 1000) - pausedSec)
}

async function assertChild(childId: string, householdId: string) {
  const child = await prisma.child.findFirst({ where: { id: childId, householdId } })
  if (!child) throw new Error('Kind nicht gefunden')
  return child
}

/** Momentaufnahme fuer die Revisionshistorie. */
function snapshot(event: {
  type: string
  startedAt: Date
  endedAt: Date | null
  payload: Prisma.JsonValue
  note: string | null
  deletedAt: Date | null
}) {
  return {
    type: event.type,
    startedAt: event.startedAt.toISOString(),
    endedAt: event.endedAt?.toISOString() ?? null,
    payload: event.payload,
    note: event.note,
    deletedAt: event.deletedAt?.toISOString() ?? null,
  }
}

export type CreateEventInput = {
  childId: string
  type: string
  startedAt: string
  endedAt?: string | null
  payload?: unknown
  note?: string
  clientId?: string
  /** Timer laeuft weiter, bis er beendet wird. */
  running?: boolean
  /** Woher der Eintrag kam. "automation" fuer Eintraege ueber /api/v1. */
  source?: string | null
}

export async function createEvent(
  ctx: ServiceContext,
  input: CreateEventInput,
): Promise<ServiceResult<{ id: string; created: boolean; duplikat?: DuplikatHinweis }>> {
  await assertChild(input.childId, ctx.householdId)

  const parsed = eventInputSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Eingabe ungültig.' }
  }
  const payload = parsePayload(parsed.data.type, parsed.data.payload)
  if (!payload.ok) return { ok: false, error: payload.error }

  // Idempotenz: Ein erneut gesendeter Queue-Eintrag legt nichts doppelt an.
  if (parsed.data.clientId) {
    const existing = await prisma.event.findUnique({ where: { clientId: parsed.data.clientId } })
    if (existing) return { ok: true, data: { id: existing.id, created: false } }
  }

  const startedAt = new Date(parsed.data.startedAt)
  const endedAt = parsed.data.endedAt ? new Date(parsed.data.endedAt) : null
  const running = input.running === true && endedAt === null

  const event = await prisma.$transaction(async (tx) => {
    const created = await tx.event.create({
      data: {
        childId: input.childId,
        type: parsed.data.type,
        startedAt,
        endedAt,
        durationSec: durationOf(startedAt, endedAt, 0),
        payload: payload.data as Prisma.InputJsonValue,
        note: parsed.data.note?.trim() || null,
        running,
        createdById: ctx.userId,
        source: input.source ?? null,
        clientId: parsed.data.clientId ?? null,
      },
    })
    await tx.eventRevision.create({
      data: {
        eventId: created.id,
        changedById: ctx.userId,
        action: 'create',
        after: snapshot(created) as Prisma.InputJsonValue,
      },
    })
    return created
  })

  await publish({
    channel: 'event',
    householdId: ctx.householdId,
    childId: input.childId,
    kind: `${event.type}:create`,
    id: event.id,
  })

  await planeMedikamentErinnerung(ctx.householdId, input.childId, event.startedAt, payload.data)

  // Hat die andere Person kurz davor dasselbe eingetragen? Der Eintrag steht
  // in jedem Fall – gefragt wird danach, nicht davor.
  const duplikat = await pruefeDuplikat(
    {
      id: event.id,
      type: event.type,
      startedAt: event.startedAt,
      endedAt: event.endedAt,
      payload: event.payload,
      createdById: event.createdById,
    },
    input.childId,
  )

  return {
    ok: true,
    data: { id: event.id, created: true, ...(duplikat ? { duplikat } : {}) },
  }
}

/**
 * Wurde ein Medikament mit Intervall eingetragen, meldet sich die App, wenn
 * die eingetragenen Stunden um sind. Ohne Intervall passiert nichts – die App
 * denkt sich keines aus.
 */
async function planeMedikamentErinnerung(
  householdId: string,
  childId: string,
  startedAt: Date,
  payload: unknown,
): Promise<void> {
  const data = payload as { kind?: string; medication?: string; repeatHours?: number }
  if (data.kind !== 'medication' || !data.repeatHours) return

  const child = await prisma.child.findUnique({
    where: { id: childId },
    select: { name: true, household: { select: { timezone: true } } },
  })
  if (!child) return

  await planeIntervallErinnerung({
    householdId,
    childId,
    childName: child.name,
    mittel: data.medication?.trim() || 'Medikament',
    gegebenAm: startedAt,
    repeatHours: data.repeatHours,
    timezone: child.household.timezone,
  })
}

export type UpdateEventInput = {
  startedAt?: string
  endedAt?: string | null
  payload?: unknown
  note?: string | null
}

export async function updateEvent(
  ctx: ServiceContext,
  eventId: string,
  input: UpdateEventInput,
): Promise<ServiceResult<{ id: string }>> {
  const event = await prisma.event.findFirst({
    where: { id: eventId, child: { householdId: ctx.householdId } },
  })
  if (!event) return { ok: false, error: 'Eintrag nicht gefunden.' }

  const startedAt = input.startedAt ? new Date(input.startedAt) : event.startedAt
  const endedAt =
    input.endedAt === undefined ? event.endedAt : input.endedAt === null ? null : new Date(input.endedAt)

  if (Number.isNaN(startedAt.getTime())) return { ok: false, error: 'Beginn ist ungültig.' }
  if (endedAt && Number.isNaN(endedAt.getTime())) return { ok: false, error: 'Ende ist ungültig.' }
  if (endedAt && endedAt.getTime() < startedAt.getTime()) {
    return { ok: false, error: 'Das Ende darf nicht vor dem Beginn liegen.' }
  }

  let payload = event.payload
  if (input.payload !== undefined) {
    const parsed = parsePayload(event.type as EventType, input.payload)
    if (!parsed.ok) return { ok: false, error: parsed.error }
    payload = parsed.data as Prisma.JsonValue
  }

  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.event.update({
      where: { id: eventId },
      data: {
        startedAt,
        endedAt,
        durationSec: durationOf(startedAt, endedAt, event.pausedSec),
        payload: payload as Prisma.InputJsonValue,
        note: input.note === undefined ? event.note : input.note?.trim() || null,
        running: endedAt === null ? event.running : false,
      },
    })
    await tx.eventRevision.create({
      data: {
        eventId,
        changedById: ctx.userId,
        action: 'update',
        before: snapshot(event) as Prisma.InputJsonValue,
        after: snapshot(next) as Prisma.InputJsonValue,
      },
    })
    return next
  })

  await publish({
    channel: 'event',
    householdId: ctx.householdId,
    childId: event.childId,
    kind: `${event.type}:update`,
    id: eventId,
  })
  return { ok: true, data: { id: updated.id } }
}

/** Soft-Delete: Der Eintrag bleibt erhalten und ist wiederherstellbar. */
export async function deleteEvent(
  ctx: ServiceContext,
  eventId: string,
): Promise<ServiceResult<{ id: string }>> {
  const event = await prisma.event.findFirst({
    where: { id: eventId, child: { householdId: ctx.householdId }, deletedAt: null },
  })
  if (!event) return { ok: false, error: 'Eintrag nicht gefunden.' }

  await prisma.$transaction(async (tx) => {
    await tx.event.update({
      where: { id: eventId },
      data: { deletedAt: new Date(), running: false },
    })
    await tx.eventRevision.create({
      data: {
        eventId,
        changedById: ctx.userId,
        action: 'delete',
        before: snapshot(event) as Prisma.InputJsonValue,
      },
    })
  })

  await publish({
    channel: 'event',
    householdId: ctx.householdId,
    childId: event.childId,
    kind: `${event.type}:delete`,
    id: eventId,
  })
  return { ok: true, data: { id: eventId } }
}

export async function restoreEvent(
  ctx: ServiceContext,
  eventId: string,
): Promise<ServiceResult<{ id: string }>> {
  const event = await prisma.event.findFirst({
    where: { id: eventId, child: { householdId: ctx.householdId }, deletedAt: { not: null } },
  })
  if (!event) return { ok: false, error: 'Eintrag nicht gefunden.' }

  await prisma.$transaction(async (tx) => {
    await tx.event.update({ where: { id: eventId }, data: { deletedAt: null } })
    await tx.eventRevision.create({
      data: {
        eventId,
        changedById: ctx.userId,
        action: 'restore',
        after: snapshot(event) as Prisma.InputJsonValue,
      },
    })
  })

  await publish({
    channel: 'event',
    householdId: ctx.householdId,
    childId: event.childId,
    kind: `${event.type}:restore`,
    id: eventId,
  })
  return { ok: true, data: { id: eventId } }
}

// ----------------------------------------------------------------- Timer ----

export async function startTimer(
  ctx: ServiceContext,
  childId: string,
  type: EventType,
  payload: unknown = {},
  clientId?: string,
  source?: string | null,
): Promise<ServiceResult<{ id: string; created: boolean; duplikat?: DuplikatHinweis }>> {
  const category = EVENT_CATEGORIES[type]
  if (!category?.timed) return { ok: false, error: 'Für diesen Eintrag gibt es keinen Timer.' }

  const running = await prisma.event.findFirst({
    where: { childId, type, running: true, deletedAt: null },
  })
  if (running) return { ok: false, error: `${category.label} läuft bereits.` }

  return createEvent(ctx, {
    childId,
    type,
    startedAt: new Date().toISOString(),
    payload,
    running: true,
    clientId,
    source,
  })
}

export async function pauseTimer(
  ctx: ServiceContext,
  eventId: string,
): Promise<ServiceResult<{ id: string; pausedAt: string }>> {
  const event = await prisma.event.findFirst({
    where: { id: eventId, child: { householdId: ctx.householdId }, running: true, deletedAt: null },
  })
  if (!event) return { ok: false, error: 'Kein laufender Timer.' }
  if (event.pausedAt) return { ok: false, error: 'Der Timer ist bereits pausiert.' }

  const pausedAt = new Date()
  await prisma.event.update({ where: { id: eventId }, data: { pausedAt } })
  await publish({
    channel: 'event',
    householdId: ctx.householdId,
    childId: event.childId,
    kind: `${event.type}:pause`,
    id: eventId,
  })
  return { ok: true, data: { id: eventId, pausedAt: pausedAt.toISOString() } }
}

export async function resumeTimer(
  ctx: ServiceContext,
  eventId: string,
): Promise<ServiceResult<{ id: string; pausedSec: number }>> {
  const event = await prisma.event.findFirst({
    where: { id: eventId, child: { householdId: ctx.householdId }, running: true, deletedAt: null },
  })
  if (!event?.pausedAt) return { ok: false, error: 'Der Timer ist nicht pausiert.' }

  const pausedSec = event.pausedSec + Math.round((Date.now() - event.pausedAt.getTime()) / 1000)
  await prisma.event.update({ where: { id: eventId }, data: { pausedAt: null, pausedSec } })
  await publish({
    channel: 'event',
    householdId: ctx.householdId,
    childId: event.childId,
    kind: `${event.type}:resume`,
    id: eventId,
  })
  return { ok: true, data: { id: eventId, pausedSec } }
}

export async function stopTimer(
  ctx: ServiceContext,
  eventId: string,
  payload?: unknown,
  endedAtIso?: string,
): Promise<ServiceResult<{ id: string; durationSec: number }>> {
  const event = await prisma.event.findFirst({
    where: { id: eventId, child: { householdId: ctx.householdId }, running: true, deletedAt: null },
  })
  if (!event) return { ok: false, error: 'Kein laufender Timer.' }

  const endedAt = endedAtIso ? new Date(endedAtIso) : new Date()
  if (Number.isNaN(endedAt.getTime()) || endedAt.getTime() < event.startedAt.getTime()) {
    return { ok: false, error: 'Das Ende darf nicht vor dem Beginn liegen.' }
  }

  // Eine offene Pause zaehlt bis zum Stopp als Pause.
  const pausedSec = event.pausedAt
    ? event.pausedSec + Math.round((endedAt.getTime() - event.pausedAt.getTime()) / 1000)
    : event.pausedSec

  let nextPayload = event.payload
  if (payload !== undefined) {
    const parsed = parsePayload(event.type as EventType, payload)
    if (!parsed.ok) return { ok: false, error: parsed.error }
    nextPayload = parsed.data as Prisma.JsonValue
  }

  const durationSec = durationOf(event.startedAt, endedAt, pausedSec) ?? 0

  await prisma.$transaction(async (tx) => {
    const next = await tx.event.update({
      where: { id: eventId },
      data: {
        endedAt,
        durationSec,
        pausedAt: null,
        pausedSec,
        running: false,
        payload: nextPayload as Prisma.InputJsonValue,
      },
    })
    await tx.eventRevision.create({
      data: {
        eventId,
        changedById: ctx.userId,
        action: 'update',
        before: snapshot(event) as Prisma.InputJsonValue,
        after: snapshot(next) as Prisma.InputJsonValue,
      },
    })
  })

  await publish({
    channel: 'event',
    householdId: ctx.householdId,
    childId: event.childId,
    kind: `${event.type}:stop`,
    id: eventId,
  })
  return { ok: true, data: { id: eventId, durationSec } }
}

export async function runningTimers(childId: string) {
  return prisma.event.findMany({
    where: { childId, running: true, deletedAt: null },
    orderBy: { startedAt: 'asc' },
  })
}
