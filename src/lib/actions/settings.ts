'use server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { destroySession, requireUser } from '@/lib/auth/session'
import { verifyPassword } from '@/lib/auth/password'
import { parseHhMm } from '@/lib/time'
import { EVENT_TYPES } from '@/lib/events/types'
import { START_SCREENS } from '@/lib/settings/display'
import { requestBackup } from '@/lib/backup/files'
import { DELETE_CONFIRMATION } from '@/lib/settings/deletion'
import { deleteChildUploads, deleteHouseholdSounds } from '@/lib/media/storage'

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

// ------------------------------------------------------------- Einheiten --

const unitsSchema = z.object({
  unitWeight: z.enum(['kg', 'lb']),
  unitLength: z.enum(['cm', 'in']),
  unitTemp: z.enum(['c', 'f']),
  unitVolume: z.enum(['ml', 'oz']),
})

export async function updateUnitsAction(
  input: z.input<typeof unitsSchema>,
): Promise<{ ok: true } | { error: string }> {
  const user = await requireUser()
  const parsed = unitsSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Eingabe ungültig.' }

  await prisma.householdSettings.upsert({
    where: { householdId: user.householdId },
    create: { householdId: user.householdId, ...parsed.data },
    update: parsed.data,
  })
  revalidatePath('/', 'layout')
  return { ok: true }
}

// -------------------------------------------- Startbildschirm & Aktionen --

const displaySchema = z.object({
  startScreen: z.enum(START_SCREENS),
  quickActions: z
    .array(z.enum(EVENT_TYPES))
    .min(1, 'Mindestens eine Schnellaktion.')
    .max(6, 'Mehr als sechs Schnellaktionen werden unübersichtlich.'),
})

export async function updateDisplayAction(
  input: z.input<typeof displaySchema>,
): Promise<{ ok: true } | { error: string }> {
  const user = await requireUser()
  const parsed = displaySchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Eingabe ungültig.' }

  // Doppelte Einträge wären in der Liste unsichtbar, aber im Datensatz da.
  const quickActions = [...new Set(parsed.data.quickActions)]

  await prisma.householdSettings.upsert({
    where: { householdId: user.householdId },
    create: { householdId: user.householdId, startScreen: parsed.data.startScreen, quickActions },
    update: { startScreen: parsed.data.startScreen, quickActions },
  })
  revalidatePath('/', 'layout')
  return { ok: true }
}

// ---------------------------------------------------------------- Backup --

/** Fordert eine Sicherung an; erstellt wird sie vom Backup-Container. */
export async function requestBackupAction(): Promise<{ ok: true } | { error: string }> {
  await requireUser()
  return requestBackup()
}

// ------------------------------------------------------ Alles loeschen ----

const deleteSchema = z.object({
  password: z.string().min(1, 'Bitte dein Passwort eingeben.'),
  confirmation: z.string(),
})

/**
 * Loescht den Haushalt mit allem, was daran haengt – beide Konten inklusive.
 * Bewusst kein Loeschen einzelner Konten: Die Eintraege der beiden sind ein
 * gemeinsamer Verlauf, in dem an jedem Eintrag haengt, wer ihn gemacht hat.
 * Ein halber Haushalt waere entweder ein kaputter oder ein gefaelschter
 * Verlauf. Wer aussteigen will, exportiert vorher – der Knopf steht daneben.
 */
export async function deleteHouseholdAction(
  input: z.input<typeof deleteSchema>,
): Promise<{ error: string } | never> {
  const user = await requireUser()
  const parsed = deleteSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Eingabe ungültig.' }
  if (parsed.data.confirmation.trim().toUpperCase() !== DELETE_CONFIRMATION) {
    return { error: `Bitte ${DELETE_CONFIRMATION} eingeben, um zu bestätigen.` }
  }

  const record = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { passwordHash: true },
  })
  if (!(await verifyPassword(record.passwordHash, parsed.data.password))) {
    return { error: 'Passwort stimmt nicht.' }
  }

  const children = await prisma.child.findMany({
    where: { householdId: user.householdId },
    select: { id: true },
  })

  // Erst die Datenbank – wenn das schiefgeht, sind die Dateien noch da.
  await prisma.household.delete({ where: { id: user.householdId } })
  for (const child of children) await deleteChildUploads(child.id)
  await deleteHouseholdSounds(user.householdId)

  await destroySession()
  redirect('/login')
}
