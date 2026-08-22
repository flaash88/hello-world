'use server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/auth/session'
import { publish } from '@/lib/realtime'

const pregnancySchema = z.object({
  dueDate: z.string().min(1, 'Bitte den errechneten Termin eintragen.'),
  lastPeriod: z.string().optional(),
  label: z.string().trim().max(40).optional(),
})

function parseDate(value: string | undefined | null): Date | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

export async function createPregnancyAction(
  input: z.input<typeof pregnancySchema>,
): Promise<{ id: string } | { error: string }> {
  const user = await requireUser()
  const parsed = pregnancySchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Eingabe ungültig.' }

  const dueDate = parseDate(parsed.data.dueDate)
  if (!dueDate) return { error: 'Der errechnete Termin ist kein gültiges Datum.' }

  const pregnancy = await prisma.pregnancy.create({
    data: {
      householdId: user.householdId,
      dueDate,
      lastPeriod: parseDate(parsed.data.lastPeriod),
      label: parsed.data.label?.trim() || 'Unser Baby',
    },
  })

  await publish({ channel: 'pregnancy', householdId: user.householdId, kind: 'created', id: pregnancy.id })
  revalidatePath('/', 'layout')
  return { id: pregnancy.id }
}

export async function updatePregnancyAction(
  pregnancyId: string,
  input: z.input<typeof pregnancySchema>,
): Promise<{ ok: true } | { error: string }> {
  const user = await requireUser()
  const parsed = pregnancySchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Eingabe ungültig.' }

  const dueDate = parseDate(parsed.data.dueDate)
  if (!dueDate) return { error: 'Der errechnete Termin ist kein gültiges Datum.' }

  const result = await prisma.pregnancy.updateMany({
    where: { id: pregnancyId, householdId: user.householdId },
    data: {
      dueDate,
      lastPeriod: parseDate(parsed.data.lastPeriod),
      label: parsed.data.label?.trim() || 'Unser Baby',
    },
  })
  if (result.count === 0) return { error: 'Schwangerschaft nicht gefunden.' }

  await publish({ channel: 'pregnancy', householdId: user.householdId, kind: 'updated', id: pregnancyId })
  revalidatePath('/', 'layout')
  return { ok: true }
}
