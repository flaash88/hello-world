'use server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/auth/session'
import { publish } from '@/lib/realtime'
import { localDateKey } from '@/lib/time'

export type ParentResult<T = unknown> = ({ ok: true } & Partial<T>) | { error: string }

/** "YYYY-MM-DD" als Date für eine reine Datumsspalte. */
function dateOnly(key: string): Date {
  return new Date(`${key}T00:00:00.000Z`)
}

// ----------------------------------------------------------- Tagescheck-in --

const checkinSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Datum ist ungültig.'),
  mood: z.number().int().min(1).max(5),
  energy: z.number().int().min(1).max(5),
  stress: z.number().int().min(1).max(5),
  note: z.string().max(1000).optional(),
  sleepHours: z.number().min(0).max(24).nullable().optional(),
  sleepQuality: z.number().int().min(1).max(5).nullable().optional(),
  wakeCount: z.number().int().min(0).max(30).nullable().optional(),
})

/**
 * Der Zehn-Sekunden-Check-in: Stimmung, Energie, Belastung und optional der
 * eigene Schlaf – alles in einem Schreibvorgang, damit es auch wirklich
 * gemacht wird.
 */
export async function saveParentCheckinAction(
  input: z.input<typeof checkinSchema>,
): Promise<ParentResult> {
  const user = await requireUser()
  const parsed = checkinSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Eingabe ungültig.' }

  const date = dateOnly(parsed.data.date)
  const { mood, energy, stress, note, sleepHours, sleepQuality, wakeCount } = parsed.data

  await prisma.moodLog.upsert({
    where: { userId_date: { userId: user.id, date } },
    create: { userId: user.id, date, mood, energy, stress, note: note?.trim() || null },
    update: { mood, energy, stress, note: note?.trim() || null },
  })

  if (sleepHours !== null && sleepHours !== undefined) {
    await prisma.parentSleepLog.upsert({
      where: { userId_date: { userId: user.id, date } },
      create: {
        userId: user.id,
        date,
        hours: sleepHours,
        quality: sleepQuality ?? 3,
        wakeCount: wakeCount ?? 0,
      },
      update: { hours: sleepHours, quality: sleepQuality ?? 3, wakeCount: wakeCount ?? 0 },
    })
  }

  revalidatePath('/eltern')
  return { ok: true }
}

// ------------------------------------------------------- Privates Journal --

const journalSchema = z.object({
  body: z.string().trim().min(1, 'Bitte etwas schreiben.').max(20000),
  mood: z.number().int().min(1).max(5).nullable().optional(),
})

/** Nur für den schreibenden User sichtbar – der einzige private Bereich. */
export async function saveParentJournalAction(
  input: z.input<typeof journalSchema> & { id?: string },
): Promise<ParentResult<{ id: string }>> {
  const user = await requireUser()
  const parsed = journalSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Eingabe ungültig.' }

  const data = { body: parsed.data.body, mood: parsed.data.mood ?? null }

  if (input.id) {
    // Die where-Bedingung stellt sicher, dass nur eigene Einträge editierbar sind.
    const updated = await prisma.parentJournalEntry.updateMany({
      where: { id: input.id, userId: user.id },
      data,
    })
    if (updated.count === 0) return { error: 'Eintrag nicht gefunden.' }
    revalidatePath('/eltern')
    return { ok: true, id: input.id }
  }

  const created = await prisma.parentJournalEntry.create({ data: { ...data, userId: user.id } })
  revalidatePath('/eltern')
  return { ok: true, id: created.id }
}

export async function deleteParentJournalAction(id: string): Promise<ParentResult> {
  const user = await requireUser()
  const deleted = await prisma.parentJournalEntry.deleteMany({ where: { id, userId: user.id } })
  if (deleted.count === 0) return { error: 'Eintrag nicht gefunden.' }
  revalidatePath('/eltern')
  return { ok: true }
}

// ------------------------------------------------------------ Nachtschicht --

const shiftSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Datum ist ungültig.'),
  userId: z.string().nullable(),
  handoverNote: z.string().max(2000).optional(),
})

/** Wer übernimmt die Nacht – und was die andere Person wissen sollte. */
export async function saveNightShiftAction(
  input: z.input<typeof shiftSchema>,
): Promise<ParentResult> {
  const user = await requireUser()
  const parsed = shiftSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Eingabe ungültig.' }

  // Nur Mitglieder des eigenen Haushalts dürfen eingeteilt werden.
  if (parsed.data.userId) {
    const member = await prisma.user.findFirst({
      where: { id: parsed.data.userId, householdId: user.householdId },
    })
    if (!member) return { error: 'Diese Person gehört nicht zum Haushalt.' }
  }

  const date = dateOnly(parsed.data.date)
  const data = {
    userId: parsed.data.userId,
    handoverNote: parsed.data.handoverNote?.trim() || null,
  }

  await prisma.nightShift.upsert({
    where: { householdId_date: { householdId: user.householdId, date } },
    create: { householdId: user.householdId, date, ...data },
    update: data,
  })

  await publish({
    channel: 'nightshift',
    householdId: user.householdId,
    kind: 'save',
    id: localDateKey(date),
  })
  revalidatePath('/eltern')
  return { ok: true }
}
