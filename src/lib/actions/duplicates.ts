'use server'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/auth/session'
import { publish } from '@/lib/realtime'
import { deleteEvent } from '@/lib/events/service'
import { zusammengefuehrtePayload } from '@/lib/events/duplicates'
import type { Prisma } from '@prisma/client'

export type DuplikatResult = { ok: true } | { error: string }

async function ladeVerdacht(id: string, householdId: string) {
  const verdacht = await prisma.eventDuplicate.findUnique({ where: { id } })
  if (!verdacht) return null

  const child = await prisma.child.findFirst({
    where: { id: verdacht.childId, householdId },
    select: { id: true },
  })
  return child ? verdacht : null
}

function fertig(householdId: string, childId: string, kind: string) {
  void publish({ channel: 'duplicate', householdId, childId, kind })
  revalidatePath('/verlauf')
  revalidatePath('/auswertung')
}

/**
 * Zusammenfuehren: der aeltere Eintrag bleibt und bekommt die Felder, die nur
 * im neueren gesetzt sind. Der neuere wird soft-geloescht – wiederherstellbar
 * wie jede andere Loeschung auch.
 */
export async function mergeDuplikatAction(id: string): Promise<DuplikatResult> {
  const user = await requireUser()
  const verdacht = await ladeVerdacht(id, user.householdId)
  if (!verdacht) return { error: 'Verdacht nicht gefunden.' }
  if (verdacht.status !== 'offen') return { ok: true }

  const [aelter, neuer] = await Promise.all([
    prisma.event.findUnique({ where: { id: verdacht.olderEventId } }),
    prisma.event.findUnique({ where: { id: verdacht.newerEventId } }),
  ])
  if (!aelter || !neuer) return { error: 'Einer der Einträge ist nicht mehr da.' }

  await prisma.event.update({
    where: { id: aelter.id },
    data: {
      payload: zusammengefuehrtePayload(aelter.payload, neuer.payload) as Prisma.InputJsonValue,
      note: aelter.note ?? neuer.note,
      // Das Ende des laengeren Zeitraums gewinnt – wer spaeter aufgewacht ist,
      // hat laenger geschlafen.
      endedAt:
        aelter.endedAt && neuer.endedAt
          ? new Date(Math.max(aelter.endedAt.getTime(), neuer.endedAt.getTime()))
          : (aelter.endedAt ?? neuer.endedAt),
    },
  })

  await deleteEvent({ userId: user.id, householdId: user.householdId }, neuer.id)

  await prisma.eventDuplicate.update({
    where: { id },
    data: { status: 'zusammengefuehrt', resolvedAt: new Date(), resolvedById: user.id },
  })

  fertig(user.householdId, verdacht.childId, 'merge')
  return { ok: true }
}

/** Ausdruecklich zwei Ereignisse. Das Paar wird nicht erneut gemeldet. */
export async function beideBehaltenAction(id: string): Promise<DuplikatResult> {
  const user = await requireUser()
  const verdacht = await ladeVerdacht(id, user.householdId)
  if (!verdacht) return { error: 'Verdacht nicht gefunden.' }

  await prisma.eventDuplicate.update({
    where: { id },
    data: { status: 'beide', resolvedAt: new Date(), resolvedById: user.id },
  })

  fertig(user.householdId, verdacht.childId, 'beide')
  return { ok: true }
}

/** Den eigenen, gerade angelegten Eintrag zuruecknehmen. */
export async function meinenLoeschenAction(
  id: string,
  eventId: string,
): Promise<DuplikatResult> {
  const user = await requireUser()
  const verdacht = await ladeVerdacht(id, user.householdId)
  if (!verdacht) return { error: 'Verdacht nicht gefunden.' }
  if (eventId !== verdacht.newerEventId && eventId !== verdacht.olderEventId) {
    return { error: 'Dieser Eintrag gehört nicht zu dem Verdacht.' }
  }

  const result = await deleteEvent({ userId: user.id, householdId: user.householdId }, eventId)
  if (!result.ok) return { error: result.error }

  await prisma.eventDuplicate.update({
    where: { id },
    data: { status: 'geloescht', resolvedAt: new Date(), resolvedById: user.id },
  })

  fertig(user.householdId, verdacht.childId, 'geloescht')
  return { ok: true }
}
