'use server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/auth/session'
import { assertChildInHousehold } from '@/lib/household'
import { KONTAKT_ROLLEN } from '@/lib/emergency/card'

export type EmergencyResult = { ok: true; id?: string } | { error: string }

const kontaktSchema = z.object({
  id: z.string().min(1).optional(),
  rolle: z.enum(KONTAKT_ROLLEN),
  name: z.string().trim().min(1, 'Bitte einen Namen eingeben.').max(80),
  nummer: z
    .string()
    .trim()
    .min(3, 'Bitte eine Telefonnummer eingeben.')
    .max(40)
    .refine((wert) => /\d/.test(wert), 'Die Nummer braucht mindestens eine Ziffer.'),
  sortOrder: z.number().int().min(0).max(99).optional(),
})

export async function saveEmergencyContactAction(
  input: z.input<typeof kontaktSchema>,
): Promise<EmergencyResult> {
  const user = await requireUser()
  const parsed = kontaktSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Eingabe ungültig.' }

  const data = {
    role: parsed.data.rolle,
    name: parsed.data.name,
    phone: parsed.data.nummer,
    sortOrder: parsed.data.sortOrder ?? 0,
  }

  if (parsed.data.id) {
    const updated = await prisma.emergencyContact.updateMany({
      where: { id: parsed.data.id, householdId: user.householdId },
      data,
    })
    if (updated.count === 0) return { error: 'Kontakt nicht gefunden.' }
    revalidatePath('/notfall')
    return { ok: true, id: parsed.data.id }
  }

  const created = await prisma.emergencyContact.create({
    data: { ...data, householdId: user.householdId },
  })
  revalidatePath('/notfall')
  return { ok: true, id: created.id }
}

export async function deleteEmergencyContactAction(id: string): Promise<EmergencyResult> {
  const user = await requireUser()
  const deleted = await prisma.emergencyContact.deleteMany({
    where: { id, householdId: user.householdId },
  })
  if (deleted.count === 0) return { error: 'Kontakt nicht gefunden.' }
  revalidatePath('/notfall')
  return { ok: true }
}

const notfallSchema = z.object({
  childId: z.string().min(1),
  /** Blutgruppe wie sie im Pass steht, z. B. "0 Rh+". Freitext, absichtlich. */
  blutgruppe: z.string().trim().max(20).optional(),
  vorerkrankungen: z.string().trim().max(500).optional(),
  adresse: z.string().trim().max(200).optional(),
})

/**
 * Die vier Angaben, die es sonst nirgends gibt. Alles andere auf der
 * Notfallkarte kommt aus vorhandenen Quellen und wird hier nicht gespiegelt.
 */
export async function saveEmergencyInfoAction(
  input: z.input<typeof notfallSchema>,
): Promise<EmergencyResult> {
  const user = await requireUser()
  const parsed = notfallSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Eingabe ungültig.' }

  await assertChildInHousehold(parsed.data.childId, user.householdId)

  await prisma.$transaction([
    prisma.child.update({
      where: { id: parsed.data.childId },
      data: {
        bloodGroup: parsed.data.blutgruppe?.trim() || null,
        conditions: parsed.data.vorerkrankungen?.trim() || null,
      },
    }),
    prisma.householdSettings.upsert({
      where: { householdId: user.householdId },
      create: {
        householdId: user.householdId,
        emergencyAddress: parsed.data.adresse?.trim() || null,
      },
      update: { emergencyAddress: parsed.data.adresse?.trim() || null },
    }),
  ])

  revalidatePath('/notfall')
  return { ok: true }
}
