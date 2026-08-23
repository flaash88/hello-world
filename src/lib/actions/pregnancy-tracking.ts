'use server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requireUser, type SessionUser } from '@/lib/auth/session'
import { publish } from '@/lib/realtime'
import { ensureHospitalBag, ensureMkpAppointments } from '@/lib/pregnancy/seed'

export type Result<T = unknown> = ({ ok: true } & T) | { error: string }

async function activePregnancy(user: SessionUser) {
  const pregnancy = await prisma.pregnancy.findFirst({
    where: { householdId: user.householdId, active: true },
    orderBy: { createdAt: 'desc' },
  })
  if (!pregnancy) throw new Error('Keine aktive Schwangerschaft')
  return pregnancy
}

function refresh(user: SessionUser, kind: string, id?: string) {
  return publish({ channel: 'pregnancy', householdId: user.householdId, kind, id })
}

// ------------------------------------------------------------ Wehen-Timer --

export async function startContractionAction(): Promise<Result<{ id: string }>> {
  const user = await requireUser()
  const pregnancy = await activePregnancy(user)

  // Eine laufende Wehe reicht – ein zweiter Start beendet sie stattdessen.
  const running = await prisma.contraction.findFirst({
    where: { pregnancyId: pregnancy.id, endedAt: null },
    orderBy: { startedAt: 'desc' },
  })
  if (running) return { error: 'Es läuft bereits eine Wehe.' }

  const created = await prisma.contraction.create({
    data: { pregnancyId: pregnancy.id, startedAt: new Date(), createdById: user.id },
  })
  await refresh(user, 'contraction-start', created.id)
  revalidatePath('/schwangerschaft/wehen')
  return { ok: true, id: created.id }
}

const stopSchema = z.object({ intensity: z.number().int().min(1).max(5).nullable().optional() })

export async function stopContractionAction(
  input: z.input<typeof stopSchema> = {},
): Promise<Result<{ id: string; durationSec: number }>> {
  const user = await requireUser()
  const pregnancy = await activePregnancy(user)
  const parsed = stopSchema.safeParse(input)
  if (!parsed.success) return { error: 'Eingabe ungültig.' }

  const running = await prisma.contraction.findFirst({
    where: { pregnancyId: pregnancy.id, endedAt: null },
    orderBy: { startedAt: 'desc' },
  })
  if (!running) return { error: 'Gerade läuft keine Wehe.' }

  const endedAt = new Date()
  const updated = await prisma.contraction.update({
    where: { id: running.id },
    data: { endedAt, intensity: parsed.data.intensity ?? null },
  })
  await refresh(user, 'contraction-stop', updated.id)
  revalidatePath('/schwangerschaft/wehen')
  return {
    ok: true,
    id: updated.id,
    durationSec: Math.round((endedAt.getTime() - running.startedAt.getTime()) / 1000),
  }
}

export async function deleteContractionAction(id: string): Promise<Result> {
  const user = await requireUser()
  const pregnancy = await activePregnancy(user)
  const result = await prisma.contraction.deleteMany({ where: { id, pregnancyId: pregnancy.id } })
  if (result.count === 0) return { error: 'Eintrag nicht gefunden.' }
  await refresh(user, 'contraction-delete', id)
  revalidatePath('/schwangerschaft/wehen')
  return { ok: true }
}

// ------------------------------------------------------ Kindsbewegungen ----

export async function recordKickAction(): Promise<
  Result<{ sessionId: string; count: number; startedAt: string; done: boolean }>
> {
  const user = await requireUser()
  const pregnancy = await activePregnancy(user)
  const now = new Date()

  // Eine Zaehlsitzung laeuft maximal zwei Stunden – danach beginnt eine neue.
  let session = await prisma.kickSession.findFirst({
    where: {
      pregnancyId: pregnancy.id,
      endedAt: null,
      startedAt: { gte: new Date(now.getTime() - 2 * 3600_000) },
    },
    orderBy: { startedAt: 'desc' },
  })

  if (!session) {
    session = await prisma.kickSession.create({
      data: { pregnancyId: pregnancy.id, startedAt: now, createdById: user.id, kicks: [], count: 0 },
    })
  }

  const kicks = [...(session.kicks as string[]), now.toISOString()]
  const count = kicks.length
  const done = count >= 10

  const updated = await prisma.kickSession.update({
    where: { id: session.id },
    data: { kicks, count, endedAt: done ? now : null },
  })

  await refresh(user, 'kick', updated.id)
  revalidatePath('/schwangerschaft/bewegungen')
  return {
    ok: true,
    sessionId: updated.id,
    count,
    startedAt: updated.startedAt.toISOString(),
    done,
  }
}

export async function resetKickSessionAction(sessionId: string): Promise<Result> {
  const user = await requireUser()
  const pregnancy = await activePregnancy(user)
  const result = await prisma.kickSession.deleteMany({
    where: { id: sessionId, pregnancyId: pregnancy.id },
  })
  if (result.count === 0) return { error: 'Zählung nicht gefunden.' }
  await refresh(user, 'kick-reset', sessionId)
  revalidatePath('/schwangerschaft/bewegungen')
  return { ok: true }
}

// --------------------------------------------------------- Mutter-Werte ----

const maternalSchema = z.object({
  recordedAt: z.string().optional(),
  weightKg: z.number().min(30).max(200).nullable().optional(),
  systolic: z.number().int().min(60).max(250).nullable().optional(),
  diastolic: z.number().int().min(30).max(160).nullable().optional(),
  pulse: z.number().int().min(30).max(220).nullable().optional(),
  symptoms: z.array(z.string().max(60)).max(20).optional(),
  note: z.string().max(1000).optional(),
})

export async function saveMaternalLogAction(
  input: z.input<typeof maternalSchema>,
): Promise<Result<{ id: string }>> {
  const user = await requireUser()
  const pregnancy = await activePregnancy(user)
  const parsed = maternalSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Eingabe ungültig.' }
  }
  const data = parsed.data

  const hasValue =
    data.weightKg != null ||
    data.systolic != null ||
    data.diastolic != null ||
    data.pulse != null ||
    (data.symptoms?.length ?? 0) > 0 ||
    Boolean(data.note?.trim())
  if (!hasValue) return { error: 'Bitte mindestens einen Wert eintragen.' }

  const recordedAt = data.recordedAt ? new Date(data.recordedAt) : new Date()
  if (Number.isNaN(recordedAt.getTime())) return { error: 'Zeitpunkt ist ungültig.' }

  const created = await prisma.maternalLog.create({
    data: {
      pregnancyId: pregnancy.id,
      recordedAt,
      weightKg: data.weightKg ?? null,
      systolic: data.systolic ?? null,
      diastolic: data.diastolic ?? null,
      pulse: data.pulse ?? null,
      symptoms: data.symptoms ?? [],
      note: data.note?.trim() || null,
      createdById: user.id,
    },
  })
  await refresh(user, 'maternal-log', created.id)
  revalidatePath('/schwangerschaft/werte')
  return { ok: true, id: created.id }
}

export async function deleteMaternalLogAction(id: string): Promise<Result> {
  const user = await requireUser()
  const pregnancy = await activePregnancy(user)
  const result = await prisma.maternalLog.deleteMany({ where: { id, pregnancyId: pregnancy.id } })
  if (result.count === 0) return { error: 'Eintrag nicht gefunden.' }
  await refresh(user, 'maternal-log-delete', id)
  revalidatePath('/schwangerschaft/werte')
  return { ok: true }
}

// --------------------------------------------------------------- Termine ----

/** Legt die MKP-Termine einmalig aus dem ET an. */
export async function ensureMkpAppointmentsAction(): Promise<Result<{ created: number }>> {
  const user = await requireUser()
  const pregnancy = await activePregnancy(user)
  const created = await ensureMkpAppointments(
    user.householdId,
    pregnancy.id,
    pregnancy.dueDate,
    user.id,
  )
  if (created > 0) {
    await refresh(user, 'appointments-seeded')
    revalidatePath('/schwangerschaft/termine')
  }
  return { ok: true, created }
}

const appointmentSchema = z.object({
  title: z.string().trim().min(1, 'Bitte einen Titel eingeben.').max(120),
  category: z.enum(['mkp', 'doctor', 'midwife', 'course', 'other']).default('other'),
  scheduledAt: z.string().optional(),
  location: z.string().max(160).optional(),
  note: z.string().max(1000).optional(),
})

export async function saveAppointmentAction(
  input: z.input<typeof appointmentSchema> & { id?: string },
): Promise<Result<{ id: string }>> {
  const user = await requireUser()
  const pregnancy = await activePregnancy(user)
  const parsed = appointmentSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Eingabe ungültig.' }

  const scheduledAt = parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null
  if (scheduledAt && Number.isNaN(scheduledAt.getTime())) return { error: 'Termin ist ungültig.' }

  const data = {
    title: parsed.data.title,
    category: parsed.data.category,
    scheduledAt,
    location: parsed.data.location?.trim() || null,
    note: parsed.data.note?.trim() || null,
  }

  if (input.id) {
    const result = await prisma.appointment.updateMany({
      where: { id: input.id, householdId: user.householdId },
      data,
    })
    if (result.count === 0) return { error: 'Termin nicht gefunden.' }
    await refresh(user, 'appointment-update', input.id)
    revalidatePath('/schwangerschaft/termine')
    return { ok: true, id: input.id }
  }

  const created = await prisma.appointment.create({
    data: { ...data, pregnancyId: pregnancy.id, householdId: user.householdId, createdById: user.id },
  })
  await refresh(user, 'appointment-create', created.id)
  revalidatePath('/schwangerschaft/termine')
  return { ok: true, id: created.id }
}

export async function toggleAppointmentDoneAction(id: string, done: boolean): Promise<Result> {
  const user = await requireUser()
  const result = await prisma.appointment.updateMany({
    where: { id, householdId: user.householdId },
    data: { done, doneAt: done ? new Date() : null },
  })
  if (result.count === 0) return { error: 'Termin nicht gefunden.' }
  await refresh(user, 'appointment-toggle', id)
  revalidatePath('/schwangerschaft/termine')
  return { ok: true }
}

export async function deleteAppointmentAction(id: string): Promise<Result> {
  const user = await requireUser()
  const result = await prisma.appointment.deleteMany({ where: { id, householdId: user.householdId } })
  if (result.count === 0) return { error: 'Termin nicht gefunden.' }
  await refresh(user, 'appointment-delete', id)
  revalidatePath('/schwangerschaft/termine')
  return { ok: true }
}

// ---------------------------------------------------------- Kliniktasche ----

export async function ensureHospitalBagAction(): Promise<Result<{ created: number }>> {
  const user = await requireUser()
  const pregnancy = await activePregnancy(user)
  const created = await ensureHospitalBag(user.householdId, pregnancy.id)
  if (created > 0) {
    await refresh(user, 'checklist-seeded')
    revalidatePath('/schwangerschaft/kliniktasche')
  }
  return { ok: true, created }
}

export async function toggleChecklistItemAction(id: string, done: boolean): Promise<Result> {
  const user = await requireUser()
  const result = await prisma.checklistItem.updateMany({
    where: { id, householdId: user.householdId },
    data: { done, doneAt: done ? new Date() : null, doneById: done ? user.id : null },
  })
  if (result.count === 0) return { error: 'Eintrag nicht gefunden.' }
  await refresh(user, 'checklist-toggle', id)
  revalidatePath('/schwangerschaft/kliniktasche')
  return { ok: true }
}

const checklistItemSchema = z.object({
  section: z.string().trim().min(1).max(60),
  label: z.string().trim().min(1, 'Bitte etwas eintragen.').max(120),
  note: z.string().max(300).optional(),
  quantity: z.string().max(40).optional(),
})

export async function addChecklistItemAction(
  input: z.input<typeof checklistItemSchema>,
): Promise<Result<{ id: string }>> {
  const user = await requireUser()
  const pregnancy = await activePregnancy(user)
  const parsed = checklistItemSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Eingabe ungültig.' }

  const last = await prisma.checklistItem.findFirst({
    where: { householdId: user.householdId, listKey: 'hospitalbag' },
    orderBy: { sortOrder: 'desc' },
    select: { sortOrder: true },
  })

  const created = await prisma.checklistItem.create({
    data: {
      pregnancyId: pregnancy.id,
      householdId: user.householdId,
      listKey: 'hospitalbag',
      section: parsed.data.section,
      label: parsed.data.label,
      note: parsed.data.note?.trim() || null,
      quantity: parsed.data.quantity?.trim() || null,
      sortOrder: (last?.sortOrder ?? 0) + 1,
      custom: true,
    },
  })
  await refresh(user, 'checklist-add', created.id)
  revalidatePath('/schwangerschaft/kliniktasche')
  return { ok: true, id: created.id }
}

export async function deleteChecklistItemAction(id: string): Promise<Result> {
  const user = await requireUser()
  const result = await prisma.checklistItem.deleteMany({
    where: { id, householdId: user.householdId },
  })
  if (result.count === 0) return { error: 'Eintrag nicht gefunden.' }
  await refresh(user, 'checklist-delete', id)
  revalidatePath('/schwangerschaft/kliniktasche')
  return { ok: true }
}

// ------------------------------------------------------------- Namensliste --

const nameSchema = z.object({
  name: z.string().trim().min(1, 'Bitte einen Namen eingeben.').max(60),
  sex: z.enum(['male', 'female', 'unknown']).default('unknown'),
  note: z.string().max(200).optional(),
})

export async function addNameSuggestionAction(
  input: z.input<typeof nameSchema>,
): Promise<Result<{ id: string }>> {
  const user = await requireUser()
  const pregnancy = await activePregnancy(user)
  const parsed = nameSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Eingabe ungültig.' }

  const existing = await prisma.nameSuggestion.findFirst({
    where: { pregnancyId: pregnancy.id, name: { equals: parsed.data.name, mode: 'insensitive' } },
  })
  if (existing) return { error: 'Dieser Name steht schon auf der Liste.' }

  const created = await prisma.nameSuggestion.create({
    data: {
      pregnancyId: pregnancy.id,
      name: parsed.data.name,
      sex: parsed.data.sex,
      note: parsed.data.note?.trim() || null,
      createdById: user.id,
      // Wer einen Namen vorschlaegt, stimmt implizit dafuer.
      votes: { create: { userId: user.id, vote: 1 } },
    },
  })
  await refresh(user, 'name-add', created.id)
  revalidatePath('/schwangerschaft/namen')
  return { ok: true, id: created.id }
}

export async function voteNameAction(suggestionId: string, vote: 1 | -1): Promise<Result> {
  const user = await requireUser()
  const pregnancy = await activePregnancy(user)
  const suggestion = await prisma.nameSuggestion.findFirst({
    where: { id: suggestionId, pregnancyId: pregnancy.id },
  })
  if (!suggestion) return { error: 'Name nicht gefunden.' }

  await prisma.nameVote.upsert({
    where: { suggestionId_userId: { suggestionId, userId: user.id } },
    create: { suggestionId, userId: user.id, vote },
    update: { vote },
  })
  await refresh(user, 'name-vote', suggestionId)
  revalidatePath('/schwangerschaft/namen')
  return { ok: true }
}

export async function undoNameVoteAction(suggestionId: string): Promise<Result> {
  const user = await requireUser()
  await prisma.nameVote.deleteMany({ where: { suggestionId, userId: user.id } })
  await refresh(user, 'name-vote-undo', suggestionId)
  revalidatePath('/schwangerschaft/namen')
  return { ok: true }
}

export async function deleteNameSuggestionAction(id: string): Promise<Result> {
  const user = await requireUser()
  const pregnancy = await activePregnancy(user)
  const result = await prisma.nameSuggestion.deleteMany({ where: { id, pregnancyId: pregnancy.id } })
  if (result.count === 0) return { error: 'Name nicht gefunden.' }
  await refresh(user, 'name-delete', id)
  revalidatePath('/schwangerschaft/namen')
  return { ok: true }
}
