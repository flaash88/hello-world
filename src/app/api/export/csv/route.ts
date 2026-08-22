import { getCurrentUser } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { eventsToCsv, measurementsToCsv, type ExportEvent } from '@/lib/export/csv'
import { EVENT_CATEGORIES, isEventType } from '@/lib/events/types'
import { localDateKey } from '@/lib/time'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * CSV je Kategorie: /api/export/csv?typ=sleep&kind=<childId>
 * Sonderfall `typ=wachstum` liefert die Wachstumsmessungen.
 */
export async function GET(request: Request): Promise<Response> {
  const user = await getCurrentUser()
  if (!user) return new Response('Nicht angemeldet', { status: 401 })

  const url = new URL(request.url)
  const type = url.searchParams.get('typ') ?? ''
  const childId = url.searchParams.get('kind')

  const child = childId
    ? await prisma.child.findFirst({ where: { id: childId, householdId: user.householdId } })
    : await prisma.child.findFirst({ where: { householdId: user.householdId, archived: false } })
  if (!child) return new Response('Kein Kind gefunden', { status: 404 })

  const household = await prisma.household.findUniqueOrThrow({
    where: { id: user.householdId },
    select: { timezone: true },
  })

  if (type === 'wachstum') {
    const measurements = await prisma.growthMeasurement.findMany({
      where: { childId: child.id },
      orderBy: { measuredAt: 'asc' },
    })
    return csvResponse(
      measurementsToCsv(measurements, household.timezone),
      `sproessling-wachstum-${localDateKey(new Date())}.csv`,
    )
  }

  if (!isEventType(type)) {
    return new Response('Unbekannte Kategorie', { status: 400 })
  }

  const [events, members] = await Promise.all([
    prisma.event.findMany({
      where: { childId: child.id, type, deletedAt: null },
      orderBy: { startedAt: 'asc' },
    }),
    prisma.user.findMany({
      where: { householdId: user.householdId },
      select: { id: true, displayName: true },
    }),
  ])
  const nameById = new Map(members.map((member) => [member.id, member.displayName]))

  const rows: ExportEvent[] = events.map((event) => ({
    id: event.id,
    type: event.type,
    startedAt: event.startedAt,
    endedAt: event.endedAt,
    durationSec: event.durationSec,
    payload: event.payload,
    note: event.note,
    createdBy: nameById.get(event.createdById) ?? '',
  }))

  return csvResponse(
    eventsToCsv(type, rows, household.timezone),
    `sproessling-${EVENT_CATEGORIES[type].type}-${localDateKey(new Date())}.csv`,
  )
}

function csvResponse(body: string, filename: string): Response {
  return new Response(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
