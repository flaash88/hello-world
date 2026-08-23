import { getCurrentUser } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { eventsBetween } from '@/lib/events/queries'
import { addDays, formatDateShort, startOfLocalDay } from '@/lib/time'
import { localeTag } from '@/lib/i18n'
import { unitPrefsFrom } from '@/lib/units'
import { druckDateiname, druckKopf } from '@/lib/print/kopf'
import { PROTOKOLL_STANDARD, PROTOKOLL_TAGE, protokoll } from '@/lib/protokoll/days'
import { buildProtokollPdf } from '@/lib/protokoll/pdf'
import type { StatEvent } from '@/lib/stats/aggregate'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** Stillprotokoll als PDF: /api/protokoll/pdf?tage=7 */
export async function GET(request: Request): Promise<Response> {
  const user = await getCurrentUser()
  if (!user) return new Response('Nicht angemeldet', { status: 401 })

  const url = new URL(request.url)
  const gewuenscht = Number(url.searchParams.get('tage'))
  const tage = (PROTOKOLL_TAGE as readonly number[]).includes(gewuenscht)
    ? gewuenscht
    : PROTOKOLL_STANDARD
  const childId = url.searchParams.get('kind')

  const household = await prisma.household.findUniqueOrThrow({
    where: { id: user.householdId },
    select: { timezone: true, settings: true },
  })
  const tz = household.timezone

  const child = childId
    ? await prisma.child.findFirst({ where: { id: childId, householdId: user.householdId } })
    : await prisma.child.findFirst({ where: { householdId: user.householdId, archived: false } })
  if (!child) return new Response('Kein Kind gefunden', { status: 404 })

  const now = new Date()
  const bis = addDays(startOfLocalDay(now, tz), 1, tz)
  const von = addDays(bis, -tage, tz)

  const [events, messungen, letzteMessung] = await Promise.all([
    // Einen Tag Vorlauf, damit Schlaf ueber Mitternacht anteilig zaehlt.
    eventsBetween(child.id, addDays(von, -1, tz), bis),
    prisma.growthMeasurement.findMany({
      where: { childId: child.id, measuredAt: { gte: von, lt: bis }, weightKg: { not: null } },
      select: { measuredAt: true, weightKg: true },
    }),
    prisma.growthMeasurement.findFirst({
      where: { childId: child.id, weightKg: { not: null } },
      orderBy: { measuredAt: 'desc' },
      select: { measuredAt: true, weightKg: true },
    }),
  ])

  const stats: StatEvent[] = events.map((event) => ({
    id: event.id,
    type: event.type,
    startedAt: event.startedAt,
    endedAt: event.endedAt,
    durationSec: event.durationSec,
    payload: event.payload,
    running: event.running,
  }))

  const tabelle = protokoll(
    stats,
    messungen.map((m) => ({ measuredAt: m.measuredAt, weightKg: m.weightKg as number })),
    { tage, birthDate: child.birthDate, timezone: tz, now },
  )

  const tagText = new Map(
    tabelle.zeilen.map((zeile) => [zeile.dayKey, formatDateShort(zeile.dayStart, tz)]),
  )

  const bytes = await buildProtokollPdf({
    kopf: druckKopf('Stillprotokoll', {
      childName: child.name,
      birthDate: child.birthDate,
      birthWeightG: child.birthWeightG,
      currentWeightKg: letzteMessung?.weightKg ?? null,
      currentWeightAt: letzteMessung?.measuredAt ?? null,
      from: tabelle.von,
      to: addDays(tabelle.bis, -1, tz),
      timezone: tz,
      units: unitPrefsFrom(household.settings),
      now,
    }),
    protokoll: tabelle,
    tagText: (dayKey) => tagText.get(dayKey) ?? dayKey,
    zahl: (value) => value.toLocaleString(localeTag(), { maximumFractionDigits: 1 }),
  })

  return new Response(Buffer.from(bytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${druckDateiname('stillprotokoll', child.name, now, tz)}"`,
      'Cache-Control': 'no-store',
    },
  })
}
