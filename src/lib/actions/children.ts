'use server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { cookiesAreSecure, requireUser } from '@/lib/auth/session'
import { ACTIVE_CHILD_COOKIE, assertChildInHousehold } from '@/lib/household'

export async function setActiveChildAction(childId: string): Promise<void> {
  const user = await requireUser()
  await assertChildInHousehold(childId, user.householdId)
  const store = await cookies()
  store.set(ACTIVE_CHILD_COOKIE, childId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: cookiesAreSecure(),
    path: '/',
    maxAge: 365 * 86400,
  })
  revalidatePath('/', 'layout')
}

const childSchema = z.object({
  name: z.string().trim().min(1, 'Bitte einen Namen eingeben.').max(60),
  birthDate: z.string().optional(),
  dueDate: z.string().optional(),
  sex: z.enum(['male', 'female', 'unknown']).default('unknown'),
})

function parseDate(value: string | undefined): Date | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

export async function createChildAction(
  input: z.input<typeof childSchema>,
): Promise<{ id: string } | { error: string }> {
  const user = await requireUser()
  const parsed = childSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Eingabe ungültig.' }

  const child = await prisma.child.create({
    data: {
      householdId: user.householdId,
      name: parsed.data.name,
      birthDate: parseDate(parsed.data.birthDate),
      dueDate: parseDate(parsed.data.dueDate),
      sex: parsed.data.sex,
    },
  })
  await setActiveChildAction(child.id)
  revalidatePath('/', 'layout')
  return { id: child.id }
}

export async function updateChildAction(
  childId: string,
  input: z.input<typeof childSchema>,
): Promise<{ ok: true } | { error: string }> {
  const user = await requireUser()
  await assertChildInHousehold(childId, user.householdId)
  const parsed = childSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Eingabe ungültig.' }

  await prisma.child.update({
    where: { id: childId },
    data: {
      name: parsed.data.name,
      birthDate: parseDate(parsed.data.birthDate),
      dueDate: parseDate(parsed.data.dueDate),
      sex: parsed.data.sex,
    },
  })
  revalidatePath('/', 'layout')
  return { ok: true }
}
