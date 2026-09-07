'use server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/auth/session'
import { assertChildInHousehold } from '@/lib/household'
import { publish } from '@/lib/realtime'
import { deleteStoredFile } from '@/lib/media/storage'
import { TON_TAGS, normalisiereTags } from '@/lib/audio/notes'

export type AudioResult = { ok: true; id?: string } | { error: string }

const notizSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1, 'Bitte einen Titel eingeben.').max(120),
  recordedAt: z.string().min(1),
  tags: z.array(z.enum(TON_TAGS)).max(TON_TAGS.length).default([]),
  milestoneId: z.string().nullable().optional(),
})

export async function saveAudioNoteAction(
  input: z.input<typeof notizSchema>,
): Promise<AudioResult> {
  const user = await requireUser()
  const parsed = notizSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Eingabe ungültig.' }

  const note = await prisma.audioNote.findFirst({
    where: { id: parsed.data.id, child: { householdId: user.householdId } },
    select: { id: true, childId: true },
  })
  if (!note) return { error: 'Aufnahme nicht gefunden.' }

  const recordedAt = new Date(parsed.data.recordedAt)
  if (Number.isNaN(recordedAt.getTime())) return { error: 'Zeitpunkt ist ungültig.' }

  // Ein Meilenstein muss zum selben Kind gehoeren – sonst haenge die Aufnahme
  // an einem fremden Moment.
  let milestoneId: string | null = null
  if (parsed.data.milestoneId) {
    const meilenstein = await prisma.milestone.findFirst({
      where: { id: parsed.data.milestoneId, childId: note.childId },
      select: { id: true },
    })
    if (!meilenstein) return { error: 'Meilenstein nicht gefunden.' }
    milestoneId = meilenstein.id
  }

  await prisma.audioNote.update({
    where: { id: note.id },
    data: {
      title: parsed.data.title,
      recordedAt,
      tags: normalisiereTags(parsed.data.tags),
      milestoneId,
    },
  })

  await publish({
    channel: 'audio',
    householdId: user.householdId,
    childId: note.childId,
    kind: 'update',
    id: note.id,
  })
  revalidatePath('/tagebuch/toene')
  return { ok: true, id: note.id }
}

/**
 * Loescht eine Aufnahme samt Datei. Anders als bei Events gibt es hier kein
 * Soft-Delete: eine Tondatei, die nur noch halb existiert, hilft niemandem,
 * und das Loeschen ist eine bewusste Entscheidung mit Rueckfrage in der UI.
 */
export async function deleteAudioNoteAction(id: string): Promise<AudioResult> {
  const user = await requireUser()
  const note = await prisma.audioNote.findFirst({
    where: { id, child: { householdId: user.householdId } },
    select: { id: true, childId: true, path: true },
  })
  if (!note) return { error: 'Aufnahme nicht gefunden.' }

  await prisma.audioNote.delete({ where: { id: note.id } })
  await deleteStoredFile(note.path)

  await publish({
    channel: 'audio',
    householdId: user.householdId,
    childId: note.childId,
    kind: 'delete',
    id: note.id,
  })
  revalidatePath('/tagebuch/toene')
  return { ok: true }
}

/** Meilensteine des Kindes fuer die Verknuepfung im Dialog. */
export async function milestoneOptionsAction(
  childId: string,
): Promise<{ id: string; title: string }[]> {
  const user = await requireUser()
  await assertChildInHousehold(childId, user.householdId)
  return prisma.milestone.findMany({
    where: { childId },
    orderBy: [{ achievedAt: 'desc' }, { createdAt: 'desc' }],
    select: { id: true, title: true },
    take: 100,
  })
}
