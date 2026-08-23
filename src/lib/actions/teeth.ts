'use server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/auth/session'
import { assertChildInHousehold } from '@/lib/household'
import { publish } from '@/lib/realtime'
import { milestoneByKey } from '@/lib/content/milestones'
import { ERSTER_ZAHN_MILESTONE } from '@/lib/teeth/overview'
import { zahnByKey } from '@/lib/teeth/schema'

export type TeethResult = { ok: true } | { error: string }

const zahnSchema = z.object({
  childId: z.string().min(1),
  toothKey: z.string().min(2).max(2),
  eruptedOn: z.string().nullable().optional(),
  lostOn: z.string().nullable().optional(),
  note: z.string().trim().max(500).optional(),
  mediaId: z.string().nullable().optional(),
})

function parseDate(value: string | null | undefined): Date | null | 'invalid' {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'invalid' : date
}

/**
 * Traegt Durchbruch, Ausfall, Notiz und Foto zu einem Zahn ein.
 *
 * Der erste Zahn mit Datum legt nebenbei den Meilenstein „Erster Zahn" an –
 * niemand soll ihn zweimal eintragen muessen. Kommt spaeter ein frueheres
 * Datum dazu, wandert der Meilenstein mit.
 */
export async function saveToothAction(input: z.input<typeof zahnSchema>): Promise<TeethResult> {
  const user = await requireUser()
  const parsed = zahnSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Eingabe ungültig.' }
  const { childId, toothKey } = parsed.data

  if (!zahnByKey(toothKey)) return { error: 'Diesen Zahn gibt es im Milchgebiss nicht.' }
  await assertChildInHousehold(childId, user.householdId)

  const eruptedOn = parseDate(parsed.data.eruptedOn)
  const lostOn = parseDate(parsed.data.lostOn)
  if (eruptedOn === 'invalid' || lostOn === 'invalid') return { error: 'Datum ist ungültig.' }
  if (eruptedOn && lostOn && lostOn.getTime() < eruptedOn.getTime()) {
    return { error: 'Der Zahn kann nicht vor dem Durchbruch ausgefallen sein.' }
  }

  let mediaId: string | null = null
  if (parsed.data.mediaId) {
    const asset = await prisma.mediaAsset.findFirst({
      where: { id: parsed.data.mediaId, childId },
      select: { id: true },
    })
    if (!asset) return { error: 'Foto nicht gefunden.' }
    mediaId = asset.id
  }

  const data = { eruptedOn, lostOn, note: parsed.data.note?.trim() || null, mediaId }

  await prisma.tooth.upsert({
    where: { childId_toothKey: { childId, toothKey } },
    create: { childId, toothKey, createdById: user.id, ...data },
    update: data,
  })

  await syncErsterZahn(childId, user.id)

  await publish({
    channel: 'tooth',
    householdId: user.householdId,
    childId,
    kind: 'save',
    id: toothKey,
  })
  revalidatePath('/zaehne')
  revalidatePath('/entwicklung')
  return { ok: true }
}

export async function deleteToothAction(childId: string, toothKey: string): Promise<TeethResult> {
  const user = await requireUser()
  await assertChildInHousehold(childId, user.householdId)

  await prisma.tooth.deleteMany({ where: { childId, toothKey } })
  await syncErsterZahn(childId, user.id)

  await publish({
    channel: 'tooth',
    householdId: user.householdId,
    childId,
    kind: 'delete',
    id: toothKey,
  })
  revalidatePath('/zaehne')
  revalidatePath('/entwicklung')
  return { ok: true }
}

/** Haelt den Meilenstein „Erster Zahn" auf dem fruehesten eingetragenen Datum. */
async function syncErsterZahn(childId: string, userId: string): Promise<void> {
  const template = milestoneByKey(ERSTER_ZAHN_MILESTONE)
  if (!template) return

  const erster = await prisma.tooth.findFirst({
    where: { childId, eruptedOn: { not: null } },
    orderBy: { eruptedOn: 'asc' },
    select: { eruptedOn: true },
  })

  const vorhanden = await prisma.milestone.findUnique({
    where: { childId_key: { childId, key: ERSTER_ZAHN_MILESTONE } },
    select: { id: true },
  })

  if (!erster) {
    // Kein Zahn mehr eingetragen: den automatisch gesetzten Haken wieder
    // zuruecknehmen, aber Notiz und Foto am Meilenstein stehen lassen.
    if (vorhanden) {
      await prisma.milestone.update({
        where: { id: vorhanden.id },
        data: { achievedAt: null },
      })
    }
    return
  }

  await prisma.milestone.upsert({
    where: { childId_key: { childId, key: ERSTER_ZAHN_MILESTONE } },
    create: {
      childId,
      key: ERSTER_ZAHN_MILESTONE,
      title: template.title,
      category: template.category,
      achievedAt: erster.eruptedOn,
      createdById: userId,
    },
    update: { achievedAt: erster.eruptedOn },
  })
}
