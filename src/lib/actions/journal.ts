'use server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/auth/session'
import { assertChildInHousehold } from '@/lib/household'
import { publish } from '@/lib/realtime'
import { deleteStoredFile } from '@/lib/media/storage'

export type JournalResult<T = unknown> = ({ ok: true } & Partial<T>) | { error: string }

const entrySchema = z.object({
  childId: z.string().min(1),
  happenedAt: z.string(),
  title: z.string().trim().max(120).optional(),
  body: z.string().trim().min(1, 'Bitte etwas schreiben.').max(20000),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
  mood: z.number().int().min(1).max(5).nullable().optional(),
  /** Lebensmonat für die Monatsfoto-Serie. */
  monthPhoto: z.number().int().min(0).max(60).nullable().optional(),
  /** Bereits hochgeladene Bilder, die diesem Eintrag zugeordnet werden. */
  mediaIds: z.array(z.string().min(1)).max(24).optional(),
})

export async function saveJournalEntryAction(
  input: z.input<typeof entrySchema> & { id?: string },
): Promise<JournalResult<{ id: string }>> {
  const user = await requireUser()
  const parsed = entrySchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Eingabe ungültig.' }
  await assertChildInHousehold(parsed.data.childId, user.householdId)

  const happenedAt = new Date(parsed.data.happenedAt)
  if (Number.isNaN(happenedAt.getTime())) return { error: 'Datum ist ungültig.' }

  const data = {
    happenedAt,
    title: parsed.data.title?.trim() || null,
    body: parsed.data.body,
    tags: parsed.data.tags ?? [],
    mood: parsed.data.mood ?? null,
    monthPhoto: parsed.data.monthPhoto ?? null,
  }

  const entry = input.id
    ? await prisma.journalEntry.update({
        where: { id: input.id },
        data,
      })
    : await prisma.journalEntry.create({
        data: { ...data, childId: parsed.data.childId, createdById: user.id },
      })

  // Hochgeladene Bilder dem Eintrag zuordnen. Die Bilder gehören bereits zum
  // Kind – geprüft wird das über die where-Bedingung.
  if (parsed.data.mediaIds && parsed.data.mediaIds.length > 0) {
    await prisma.mediaAsset.updateMany({
      where: { id: { in: parsed.data.mediaIds }, childId: parsed.data.childId },
      data: { journalEntryId: entry.id },
    })
  }

  await publish({
    channel: 'journal',
    householdId: user.householdId,
    childId: parsed.data.childId,
    kind: input.id ? 'update' : 'create',
    id: entry.id,
  })
  revalidatePath('/tagebuch')
  return { ok: true, id: entry.id }
}

export async function deleteJournalEntryAction(id: string): Promise<JournalResult> {
  const user = await requireUser()
  const entry = await prisma.journalEntry.findFirst({
    where: { id, child: { householdId: user.householdId } },
    include: { media: true },
  })
  if (!entry) return { error: 'Eintrag nicht gefunden.' }

  // Bilder des Eintrags mitlöschen – sie gehören sonst zu nichts mehr.
  for (const asset of entry.media) {
    await deleteStoredFile(asset.path)
    if (asset.thumbPath) await deleteStoredFile(asset.thumbPath)
  }
  await prisma.mediaAsset.deleteMany({ where: { journalEntryId: id } })
  await prisma.journalEntry.delete({ where: { id } })

  await publish({ channel: 'journal', householdId: user.householdId, kind: 'delete', id })
  revalidatePath('/tagebuch')
  return { ok: true }
}

/** Bisher verwendete Schlagwörter als Vorschlagsliste. */
export async function knownJournalTagsAction(childId: string): Promise<string[]> {
  const user = await requireUser()
  await assertChildInHousehold(childId, user.householdId)

  const rows = await prisma.$queryRaw<{ tag: string; uses: bigint }[]>`
    SELECT tag, COUNT(*) AS uses
    FROM "JournalEntry", jsonb_array_elements_text(tags) AS tag
    WHERE "childId" = ${childId}
    GROUP BY tag
    ORDER BY uses DESC, tag ASC
    LIMIT 30
  `
  return rows.map((row) => row.tag)
}
