'use server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/auth/session'
import { parseHhMm } from '@/lib/time'

const nightModeSchema = z.object({
  nightModeAuto: z.boolean(),
  nightModeStart: z.string().refine((v) => parseHhMm(v) !== null, 'Ungültige Uhrzeit.'),
  nightModeEnd: z.string().refine((v) => parseHhMm(v) !== null, 'Ungültige Uhrzeit.'),
})

export async function updateNightModeAction(
  input: z.input<typeof nightModeSchema>,
): Promise<{ ok: true } | { error: string }> {
  const user = await requireUser()
  const parsed = nightModeSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Eingabe ungültig.' }

  await prisma.householdSettings.upsert({
    where: { householdId: user.householdId },
    create: { householdId: user.householdId, ...parsed.data },
    update: parsed.data,
  })
  revalidatePath('/', 'layout')
  return { ok: true }
}
