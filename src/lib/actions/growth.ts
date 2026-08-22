'use server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/auth/session'
import { assertChildInHousehold } from '@/lib/household'
import { publish } from '@/lib/realtime'

const measurementSchema = z.object({
  childId: z.string().min(1),
  measuredAt: z.string(),
  weightKg: z.number().min(0.3).max(60).nullable().optional(),
  lengthCm: z.number().min(20).max(160).nullable().optional(),
  headCm: z.number().min(20).max(70).nullable().optional(),
  note: z.string().max(500).optional(),
})

export type GrowthResultAction = { ok: true; id: string } | { error: string }

export async function saveMeasurementAction(
  input: z.input<typeof measurementSchema> & { id?: string },
): Promise<GrowthResultAction> {
  const user = await requireUser()
  const parsed = measurementSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Eingabe ungültig.' }

  await assertChildInHousehold(parsed.data.childId, user.householdId)

  const measuredAt = new Date(parsed.data.measuredAt)
  if (Number.isNaN(measuredAt.getTime())) return { error: 'Zeitpunkt ist ungültig.' }
  if (measuredAt.getTime() > Date.now() + 5 * 60_000) {
    return { error: 'Der Zeitpunkt darf nicht in der Zukunft liegen.' }
  }

  const { weightKg, lengthCm, headCm } = parsed.data
  if (weightKg == null && lengthCm == null && headCm == null) {
    return { error: 'Bitte mindestens einen Messwert eintragen.' }
  }

  const data = {
    measuredAt,
    weightKg: weightKg ?? null,
    lengthCm: lengthCm ?? null,
    headCm: headCm ?? null,
    note: parsed.data.note?.trim() || null,
  }

  if (input.id) {
    const updated = await prisma.growthMeasurement.updateMany({
      where: { id: input.id, child: { householdId: user.householdId } },
      data,
    })
    if (updated.count === 0) return { error: 'Messung nicht gefunden.' }
    await publish({
      channel: 'growth',
      householdId: user.householdId,
      childId: parsed.data.childId,
      kind: 'update',
      id: input.id,
    })
    revalidatePath('/wachstum')
    return { ok: true, id: input.id }
  }

  const created = await prisma.growthMeasurement.create({
    data: { ...data, childId: parsed.data.childId, createdById: user.id },
  })
  await publish({
    channel: 'growth',
    householdId: user.householdId,
    childId: parsed.data.childId,
    kind: 'create',
    id: created.id,
  })
  revalidatePath('/wachstum')
  return { ok: true, id: created.id }
}

export async function deleteMeasurementAction(id: string): Promise<{ ok: true } | { error: string }> {
  const user = await requireUser()
  const deleted = await prisma.growthMeasurement.deleteMany({
    where: { id, child: { householdId: user.householdId } },
  })
  if (deleted.count === 0) return { error: 'Messung nicht gefunden.' }
  await publish({ channel: 'growth', householdId: user.householdId, kind: 'delete', id })
  revalidatePath('/wachstum')
  return { ok: true }
}
