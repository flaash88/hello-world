'use server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/auth/session'
import { publish } from '@/lib/realtime'
import { syncVorratErinnerungen } from '@/lib/milk/reminders'
import { nachEntnahme, type Portion } from '@/lib/milk/portions'
import {
  HALTBARKEIT_MAX_STUNDEN,
  HALTBARKEIT_MIN_STUNDEN,
  LAGERORTE,
} from '@/lib/milk/storage'

export type MilkResult = { ok: true; id?: string } | { error: string }

const portionSchema = z.object({
  childId: z.string().min(1).nullable().optional(),
  abgepumptAm: z.string().min(1),
  mengeMl: z.number().int().min(1, 'Bitte eine Menge eintragen.').max(1000),
  lagerort: z.enum(LAGERORTE),
  behaelter: z.string().trim().max(60).optional(),
  notiz: z.string().trim().max(500).optional(),
  eventId: z.string().nullable().optional(),
})

async function nachbereiten(householdId: string, kind: string, id?: string) {
  await syncVorratErinnerungen(householdId)
  await publish({ channel: 'vorrat', householdId, kind, id })
  revalidatePath('/vorrat')
}

export async function savePortionAction(
  input: z.input<typeof portionSchema> & { id?: string },
): Promise<MilkResult> {
  const user = await requireUser()
  const parsed = portionSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Eingabe ungültig.' }

  const abgepumptAm = new Date(parsed.data.abgepumptAm)
  if (Number.isNaN(abgepumptAm.getTime())) return { error: 'Datum ist ungültig.' }

  if (parsed.data.childId) {
    const child = await prisma.child.findFirst({
      where: { id: parsed.data.childId, householdId: user.householdId },
      select: { id: true },
    })
    if (!child) return { error: 'Kind nicht gefunden.' }
  }

  const data = {
    childId: parsed.data.childId ?? null,
    abgepumptAm,
    mengeMl: parsed.data.mengeMl,
    lagerort: parsed.data.lagerort,
    behaelter: parsed.data.behaelter?.trim() || null,
    notiz: parsed.data.notiz?.trim() || null,
    eventId: parsed.data.eventId ?? null,
  }

  if (input.id) {
    const updated = await prisma.milkPortion.updateMany({
      where: { id: input.id, householdId: user.householdId },
      data,
    })
    if (updated.count === 0) return { error: 'Portion nicht gefunden.' }
    await nachbereiten(user.householdId, 'update', input.id)
    return { ok: true, id: input.id }
  }

  const created = await prisma.milkPortion.create({
    data: { ...data, householdId: user.householdId, createdById: user.id },
  })
  await nachbereiten(user.householdId, 'create', created.id)
  return { ok: true, id: created.id }
}

/**
 * Portion verbrauchen. Ohne Menge gilt sie ganz als verbraucht; mit Menge
 * bleibt der Rest im Vorrat stehen und behaelt sein Ablaufdatum.
 */
export async function verbrauchePortionAction(
  id: string,
  mengeMl?: number,
): Promise<MilkResult> {
  const user = await requireUser()
  const portion = await prisma.milkPortion.findFirst({
    where: { id, householdId: user.householdId },
  })
  if (!portion) return { error: 'Portion nicht gefunden.' }
  if (portion.status !== 'vorraetig') return { error: 'Diese Portion ist nicht mehr im Vorrat.' }

  const teil = typeof mengeMl === 'number' && mengeMl > 0 && mengeMl < portion.mengeMl
  const { restMl, status } = nachEntnahme(portion as Portion, teil ? mengeMl : portion.mengeMl)

  await prisma.milkPortion.update({
    where: { id },
    data: {
      mengeMl: status === 'vorraetig' ? restMl : portion.mengeMl,
      status,
      verbrauchtAm: status === 'verbraucht' ? new Date() : null,
    },
  })

  await nachbereiten(user.householdId, 'verbraucht', id)
  return { ok: true, id }
}

export async function verwerfePortionAction(id: string): Promise<MilkResult> {
  const user = await requireUser()
  const updated = await prisma.milkPortion.updateMany({
    where: { id, householdId: user.householdId, status: 'vorraetig' },
    data: { status: 'verworfen', verbrauchtAm: new Date() },
  })
  if (updated.count === 0) return { error: 'Portion nicht gefunden.' }

  await nachbereiten(user.householdId, 'verworfen', id)
  return { ok: true, id }
}

/**
 * Portion auftauen: sie wandert in den Kuehlschrank und bekommt ab jetzt das
 * kurze Fenster fuer aufgetaute Milch. Wieder einfrieren geht nicht – deshalb
 * gibt es auch keinen Weg zurueck.
 */
export async function auftauenAction(id: string): Promise<MilkResult> {
  const user = await requireUser()
  const portion = await prisma.milkPortion.findFirst({
    where: { id, householdId: user.householdId, status: 'vorraetig' },
    select: { id: true, aufgetautAm: true },
  })
  if (!portion) return { error: 'Portion nicht gefunden.' }
  if (portion.aufgetautAm) return { error: 'Diese Portion ist schon aufgetaut.' }

  await prisma.milkPortion.update({
    where: { id },
    data: { aufgetautAm: new Date(), lagerort: 'kuehlschrank' },
  })

  await nachbereiten(user.householdId, 'aufgetaut', id)
  return { ok: true, id }
}

const einstellungenSchema = z.object({
  milkFridgeHours: z.number().int().min(HALTBARKEIT_MIN_STUNDEN).max(HALTBARKEIT_MAX_STUNDEN),
  milkFreezerHours: z.number().int().min(HALTBARKEIT_MIN_STUNDEN).max(HALTBARKEIT_MAX_STUNDEN),
  milkDeepFreezeHours: z.number().int().min(HALTBARKEIT_MIN_STUNDEN).max(HALTBARKEIT_MAX_STUNDEN),
  milkThawedHours: z.number().int().min(HALTBARKEIT_MIN_STUNDEN).max(HALTBARKEIT_MAX_STUNDEN),
  milkExpiryPush: z.boolean(),
})

export async function saveMilkSettingsAction(
  input: z.input<typeof einstellungenSchema>,
): Promise<MilkResult> {
  const user = await requireUser()
  const parsed = einstellungenSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Bitte Stunden zwischen 1 und 9600 angeben.' }
  }

  await prisma.householdSettings.upsert({
    where: { householdId: user.householdId },
    create: { householdId: user.householdId, ...parsed.data },
    update: parsed.data,
  })

  await nachbereiten(user.householdId, 'einstellungen')
  return { ok: true }
}
