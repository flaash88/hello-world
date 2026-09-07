'use server'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/auth/session'
import { assertChildInHousehold } from '@/lib/household'
import { addDays, formatTime, startOfLocalDay } from '@/lib/time'
import { eventDetail, eventTitle } from '@/lib/events/format'
import { unitPrefsFrom } from '@/lib/units'

export type TagesEreignisRow = {
  id: string
  zeit: string
  art: string
  detail: string
  wer: { initials: string; color: string; displayName: string } | null
}

/**
 * Die Einzelereignisse eines Kalendertags – das, was hinter einer Zeile des
 * Protokolls steckt. Wird erst geladen, wenn jemand die Zeile antippt; die
 * Tabelle selbst soll schnell dastehen.
 */
export async function tagesEreignisseAction(
  childId: string,
  dayKey: string,
): Promise<TagesEreignisRow[] | { error: string }> {
  const user = await requireUser()
  await assertChildInHousehold(childId, user.householdId)

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) return { error: 'Ungültiger Tag.' }

  const household = await prisma.household.findUniqueOrThrow({
    where: { id: user.householdId },
    select: { timezone: true, settings: true },
  })
  const tz = household.timezone
  const units = unitPrefsFrom(household.settings)

  // Mittags ansetzen, damit die Zeitzonenumrechnung nicht am Tagesrand kippt.
  const von = startOfLocalDay(new Date(`${dayKey}T12:00:00.000Z`), tz)
  const bis = addDays(von, 1, tz)

  const rows = await prisma.event.findMany({
    where: { childId, deletedAt: null, startedAt: { gte: von, lt: bis } },
    orderBy: { startedAt: 'asc' },
    include: { createdBy: { select: { displayName: true, initials: true, color: true } } },
  })

  return rows.map((row) => ({
    id: row.id,
    zeit: formatTime(row.startedAt, tz),
    art: eventTitle(row),
    detail: eventDetail(row, units) ?? row.note ?? '',
    wer: row.createdBy,
  }))
}
