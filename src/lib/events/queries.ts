import 'server-only'
import { prisma } from '@/lib/db'
import { startOfLocalDay, addDays } from '@/lib/time'
import type { EventType } from './types'

export type EventRow = {
  id: string
  type: string
  startedAt: string
  endedAt: string | null
  durationSec: number | null
  running: boolean
  payload: unknown
  note: string | null
  createdBy: { id: string; displayName: string; initials: string; color: string } | null
}

type Member = { id: string; displayName: string; initials: string; color: string }

function toRow(
  event: {
    id: string
    type: string
    startedAt: Date
    endedAt: Date | null
    durationSec: number | null
    running: boolean
    payload: unknown
    note: string | null
    createdById: string
  },
  members: Map<string, Member>,
): EventRow {
  return {
    id: event.id,
    type: event.type,
    startedAt: event.startedAt.toISOString(),
    endedAt: event.endedAt?.toISOString() ?? null,
    durationSec: event.durationSec,
    running: event.running,
    payload: event.payload,
    note: event.note,
    createdBy: members.get(event.createdById) ?? null,
  }
}

/** Die letzten `limit` Eintraege, neueste zuerst. */
export async function recentEvents(
  childId: string,
  members: Member[],
  limit = 30,
  types?: EventType[],
): Promise<EventRow[]> {
  const events = await prisma.event.findMany({
    where: {
      childId,
      deletedAt: null,
      ...(types && types.length > 0 ? { type: { in: types } } : {}),
    },
    orderBy: { startedAt: 'desc' },
    take: limit,
  })
  const map = new Map(members.map((m) => [m.id, m]))
  return events.map((event) => toRow(event, map))
}

/** Alle Eintraege eines lokalen Tages. */
export async function eventsForDay(
  childId: string,
  day: Date,
  members: Member[],
  timezone?: string,
): Promise<EventRow[]> {
  const from = startOfLocalDay(day, timezone)
  const to = addDays(from, 1, timezone)
  const events = await prisma.event.findMany({
    where: { childId, deletedAt: null, startedAt: { gte: from, lt: to } },
    orderBy: { startedAt: 'desc' },
  })
  const map = new Map(members.map((m) => [m.id, m]))
  return events.map((event) => toRow(event, map))
}

/**
 * Alle Eintraege eines Zeitraums, aufsteigend. Basis fuer Statistiken und die
 * 24h-Uhr. Ein Schlafblock kann ueber Mitternacht gehen – deshalb wird auch
 * mitgenommen, was vor `from` begonnen hat und danach noch lief.
 */
export async function eventsBetween(
  childId: string,
  from: Date,
  to: Date,
  types?: EventType[],
) {
  return prisma.event.findMany({
    where: {
      childId,
      deletedAt: null,
      ...(types && types.length > 0 ? { type: { in: types } } : {}),
      OR: [
        { startedAt: { gte: from, lt: to } },
        { AND: [{ startedAt: { lt: from } }, { endedAt: { gt: from } }] },
        { AND: [{ startedAt: { lt: from } }, { endedAt: null }, { running: true }] },
      ],
    },
    orderBy: { startedAt: 'asc' },
  })
}

/** Der jeweils letzte Eintrag pro Typ – fuer die "zuletzt"-Zeilen. */
export async function lastEventPerType(childId: string): Promise<Map<string, EventRow>> {
  const events = await prisma.$queryRaw<
    {
      id: string
      type: string
      startedAt: Date
      endedAt: Date | null
      durationSec: number | null
      running: boolean
      payload: unknown
      note: string | null
      createdById: string
    }[]
  >`
    SELECT DISTINCT ON (type)
      id, type, "startedAt", "endedAt", "durationSec", running, payload, note, "createdById"
    FROM "Event"
    WHERE "childId" = ${childId} AND "deletedAt" IS NULL
    ORDER BY type, "startedAt" DESC
  `
  const map = new Map<string, EventRow>()
  for (const event of events) {
    map.set(event.type, toRow(event, new Map()))
  }
  return map
}

/** Bisher eingetragene Lebensmittel als Autocomplete-Quelle. */
export async function knownFoods(childId: string, limit = 40): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ food: string; uses: bigint }[]>`
    SELECT food, COUNT(*) AS uses
    FROM "Event", jsonb_array_elements_text(payload -> 'foods') AS food
    WHERE "childId" = ${childId} AND type = 'solids' AND "deletedAt" IS NULL
    GROUP BY food
    ORDER BY uses DESC, food ASC
    LIMIT ${limit}
  `
  return rows.map((row) => row.food)
}

/** Zuletzt verwendete Stillseite – Grundlage fuer den Seitenvorschlag. */
export async function lastNursingSide(childId: string): Promise<string | null> {
  const event = await prisma.event.findFirst({
    where: { childId, type: 'nursing', deletedAt: null },
    orderBy: { startedAt: 'desc' },
    select: { payload: true },
  })
  const payload = event?.payload as { side?: string } | null
  return payload?.side ?? null
}
