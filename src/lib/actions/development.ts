'use server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/auth/session'
import { assertChildInHousehold } from '@/lib/household'
import { publish } from '@/lib/realtime'
import { milestoneByKey } from '@/lib/content/milestones'
import { exerciseById } from '@/lib/content/exercises'

export type DevResult<T = unknown> = ({ ok: true } & Partial<T>) | { error: string }

// ------------------------------------------------------------ Meilensteine --

const milestoneSchema = z.object({
  childId: z.string().min(1),
  key: z.string().max(60).nullable().optional(),
  title: z.string().trim().min(1, 'Bitte einen Titel eingeben.').max(120),
  category: z.string().max(30).default('other'),
  achievedAt: z.string().nullable().optional(),
  note: z.string().max(1000).optional(),
})

export async function saveMilestoneAction(
  input: z.input<typeof milestoneSchema> & { id?: string },
): Promise<DevResult<{ id: string }>> {
  const user = await requireUser()
  const parsed = milestoneSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Eingabe ungültig.' }
  await assertChildInHousehold(parsed.data.childId, user.householdId)

  const achievedAt = parsed.data.achievedAt ? new Date(parsed.data.achievedAt) : null
  if (achievedAt && Number.isNaN(achievedAt.getTime())) return { error: 'Datum ist ungültig.' }

  const data = {
    title: parsed.data.title,
    category: parsed.data.category,
    achievedAt,
    note: parsed.data.note?.trim() || null,
  }

  if (input.id) {
    const updated = await prisma.milestone.updateMany({
      where: { id: input.id, child: { householdId: user.householdId } },
      data,
    })
    if (updated.count === 0) return { error: 'Meilenstein nicht gefunden.' }
    await publish({ channel: 'milestone', householdId: user.householdId, kind: 'update', id: input.id })
    revalidatePath('/entwicklung')
    return { ok: true, id: input.id }
  }

  // Kuratierte Meilensteine sind je Kind eindeutig – ein zweites Abhaken
  // aktualisiert den vorhandenen Eintrag statt einen doppelten anzulegen.
  const created = parsed.data.key
    ? await prisma.milestone.upsert({
        where: { childId_key: { childId: parsed.data.childId, key: parsed.data.key } },
        create: { ...data, childId: parsed.data.childId, key: parsed.data.key, createdById: user.id },
        update: data,
      })
    : await prisma.milestone.create({
        data: { ...data, childId: parsed.data.childId, createdById: user.id },
      })

  await publish({ channel: 'milestone', householdId: user.householdId, kind: 'save', id: created.id })
  revalidatePath('/entwicklung')
  return { ok: true, id: created.id }
}

/** Kuratierten Meilenstein abhaken oder das Häkchen zurücknehmen. */
export async function toggleMilestoneAction(
  childId: string,
  key: string,
  achieved: boolean,
): Promise<DevResult> {
  const user = await requireUser()
  await assertChildInHousehold(childId, user.householdId)

  const template = milestoneByKey(key)
  if (!template) return { error: 'Unbekannter Meilenstein.' }

  if (!achieved) {
    await prisma.milestone.deleteMany({ where: { childId, key } })
  } else {
    await prisma.milestone.upsert({
      where: { childId_key: { childId, key } },
      create: {
        childId,
        key,
        title: template.title,
        category: template.category,
        achievedAt: new Date(),
        createdById: user.id,
      },
      update: { achievedAt: new Date() },
    })
  }

  await publish({ channel: 'milestone', householdId: user.householdId, childId, kind: 'toggle', id: key })
  revalidatePath('/entwicklung')
  return { ok: true }
}

export async function deleteMilestoneAction(id: string): Promise<DevResult> {
  const user = await requireUser()
  const deleted = await prisma.milestone.deleteMany({
    where: { id, child: { householdId: user.householdId } },
  })
  if (deleted.count === 0) return { error: 'Meilenstein nicht gefunden.' }
  await publish({ channel: 'milestone', householdId: user.householdId, kind: 'delete', id })
  revalidatePath('/entwicklung')
  return { ok: true }
}

// ----------------------------------------------------------------- Übungen --

export async function logExerciseAction(
  childId: string,
  exerciseId: string,
  rating?: number,
): Promise<DevResult<{ id: string }>> {
  const user = await requireUser()
  await assertChildInHousehold(childId, user.householdId)
  if (!exerciseById(exerciseId)) return { error: 'Unbekannte Übung.' }

  const created = await prisma.exerciseLog.create({
    data: {
      childId,
      exerciseId,
      userId: user.id,
      rating: rating && rating >= 1 && rating <= 3 ? rating : null,
    },
  })
  await publish({ channel: 'exercise', householdId: user.householdId, childId, kind: 'done', id: exerciseId })
  revalidatePath('/entwicklung')
  return { ok: true, id: created.id }
}

export async function undoExerciseLogAction(id: string): Promise<DevResult> {
  const user = await requireUser()
  const deleted = await prisma.exerciseLog.deleteMany({
    where: { id, child: { householdId: user.householdId } },
  })
  if (deleted.count === 0) return { error: 'Eintrag nicht gefunden.' }
  revalidatePath('/entwicklung')
  return { ok: true }
}
