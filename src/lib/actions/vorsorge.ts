'use server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/auth/session'
import { assertChildInHousehold } from '@/lib/household'
import { publish } from '@/lib/realtime'
import { createEvent } from '@/lib/events/service'
import { loadImpfplan, loadUntersuchungen } from '@/lib/vorsorge/load'
import { syncVorsorgeReminders } from '@/lib/vorsorge/reminders'
import { VORSORGE_KINDS } from '@/lib/vorsorge/schema'

export type VorsorgeResult = { ok: true; id?: string } | { error: string }

async function householdTimezone(householdId: string): Promise<string> {
  const household = await prisma.household.findUniqueOrThrow({
    where: { id: householdId },
    select: { timezone: true },
  })
  return household.timezone
}

const doneSchema = z.object({
  childId: z.string().min(1),
  kind: z.enum(VORSORGE_KINDS),
  templateKey: z.string().min(1).max(60),
  doneAt: z.string().min(1),
  ort: z.string().trim().max(120).optional(),
  note: z.string().trim().max(1000).optional(),
  mediaId: z.string().nullable().optional(),
})

/** Titel des Eintrags aus den Inhaltsdateien – die DB speichert nur den Schluessel. */
async function titelFor(kind: 'impfung' | 'untersuchung', templateKey: string) {
  if (kind === 'impfung') {
    const plan = await loadImpfplan()
    return plan.impfungen.find((i) => i.key === templateKey)?.name ?? null
  }
  const daten = await loadUntersuchungen()
  const nummer = Number(templateKey.replace('ekp-kind-', ''))
  const eintrag = daten.kind.find((k) => k.nummer === nummer)
  return eintrag ? `${eintrag.nummer}. ${eintrag.bezeichnung}` : null
}

/**
 * Haekt einen Vorsorgetermin ab. Eine Impfung legt zusaetzlich ein
 * Gesundheits-Event an – damit taucht sie im Verlauf an ihrem Datum auf und
 * nicht nur in der Vorsorgeliste.
 */
export async function markVorsorgeDoneAction(
  input: z.input<typeof doneSchema>,
): Promise<VorsorgeResult> {
  const user = await requireUser()
  const parsed = doneSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Eingabe ungültig.' }
  const { childId, kind, templateKey } = parsed.data

  const child = await assertChildInHousehold(childId, user.householdId)

  const doneAt = new Date(parsed.data.doneAt)
  if (Number.isNaN(doneAt.getTime())) return { error: 'Datum ist ungültig.' }

  const titel = await titelFor(kind, templateKey)
  if (!titel) return { error: 'Dieser Vorsorgetermin ist nicht bekannt.' }

  // Das Foto muss zum selben Kind gehoeren – sonst waere es ein fremdes Bild.
  let mediaId: string | null = null
  if (parsed.data.mediaId) {
    const asset = await prisma.mediaAsset.findFirst({
      where: { id: parsed.data.mediaId, childId },
      select: { id: true },
    })
    if (!asset) return { error: 'Foto nicht gefunden.' }
    mediaId = asset.id
  }

  const vorhanden = await prisma.vorsorgeEntry.findUnique({
    where: { childId_kind_templateKey: { childId, kind, templateKey } },
    select: { id: true, eventId: true },
  })

  let eventId = vorhanden?.eventId ?? null
  if (kind === 'impfung' && !eventId) {
    const created = await createEvent(
      { userId: user.id, householdId: user.householdId },
      {
        childId,
        type: 'health',
        startedAt: doneAt.toISOString(),
        payload: { kind: 'vaccination', vaccine: titel },
        note: parsed.data.note?.trim() || undefined,
      },
    )
    if (created.ok) eventId = created.data.id
  }

  const data = {
    doneAt,
    ort: parsed.data.ort?.trim() || null,
    note: parsed.data.note?.trim() || null,
    mediaId,
    eventId,
  }

  const entry = await prisma.vorsorgeEntry.upsert({
    where: { childId_kind_templateKey: { childId, kind, templateKey } },
    create: { childId, kind, templateKey, createdById: user.id, ...data },
    update: data,
  })

  await syncVorsorgeReminders(child, await householdTimezone(user.householdId))
  await publish({
    channel: 'vorsorge',
    householdId: user.householdId,
    childId,
    kind: `${kind}:done`,
    id: entry.id,
  })
  revalidatePath('/vorsorge')
  return { ok: true, id: entry.id }
}

/** Nimmt das Häkchen zurück. Ein daran haengendes Event wird mit geloescht. */
export async function undoVorsorgeAction(
  childId: string,
  kind: string,
  templateKey: string,
): Promise<VorsorgeResult> {
  const user = await requireUser()
  const child = await assertChildInHousehold(childId, user.householdId)
  const parsedKind = z.enum(VORSORGE_KINDS).safeParse(kind)
  if (!parsedKind.success) return { error: 'Unbekannte Kategorie.' }

  const entry = await prisma.vorsorgeEntry.findUnique({
    where: { childId_kind_templateKey: { childId, kind: parsedKind.data, templateKey } },
    select: { id: true, eventId: true },
  })
  if (!entry) return { ok: true }

  await prisma.vorsorgeEntry.delete({ where: { id: entry.id } })
  if (entry.eventId) {
    // Soft-Delete, wie ueberall: der Eintrag bleibt wiederherstellbar.
    await prisma.event.updateMany({
      where: { id: entry.eventId, deletedAt: null },
      data: { deletedAt: new Date() },
    })
  }

  await syncVorsorgeReminders(child, await householdTimezone(user.householdId))
  await publish({
    channel: 'vorsorge',
    householdId: user.householdId,
    childId,
    kind: `${parsedKind.data}:undo`,
    id: entry.id,
  })
  revalidatePath('/vorsorge')
  return { ok: true }
}
