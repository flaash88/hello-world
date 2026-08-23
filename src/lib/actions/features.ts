'use server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/auth/session'
import {
  DEFAULT_FEATURE_LEVEL,
  FEATURE_KEYS,
  FEATURE_LEVELS,
  mitSchalter,
  parseFeatureLevel,
  parseFeatureOverrides,
  pauseEnde,
} from '@/lib/settings/features'

type Result = { ok: true } | { error: string }

async function haushalt() {
  const user = await requireUser()
  const household = await prisma.household.findUniqueOrThrow({
    where: { id: user.householdId },
    select: { id: true, featureLevel: true, featureOverrides: true },
  })
  return household
}

/**
 * Nach jeder Aenderung muss das ganze Layout neu gebaut werden: die Tab-Leiste
 * haengt an denselben Schaltern.
 */
function erneuern(): void {
  revalidatePath('/', 'layout')
}

const stufeSchema = z.object({ level: z.enum(FEATURE_LEVELS) })

/**
 * Eine Stufe waehlen. Setzt die Einzelschalter zurueck – die Stufe ist eine
 * Voreinstellung, keine Untergrenze.
 */
export async function setFeatureLevelAction(input: z.input<typeof stufeSchema>): Promise<Result> {
  const user = await requireUser()
  const parsed = stufeSchema.safeParse(input)
  if (!parsed.success) return { error: 'Unbekannte Stufe.' }

  await prisma.household.update({
    where: { id: user.householdId },
    data: { featureLevel: parsed.data.level, featureOverrides: {} },
  })
  erneuern()
  return { ok: true }
}

const schalterSchema = z.object({ key: z.enum(FEATURE_KEYS), an: z.boolean() })

/** Einen einzelnen Bereich ein- oder ausschalten. */
export async function toggleFeatureAction(input: z.input<typeof schalterSchema>): Promise<Result> {
  const parsed = schalterSchema.safeParse(input)
  if (!parsed.success) return { error: 'Unbekannter Bereich.' }
  const household = await haushalt()

  const level = parseFeatureLevel(household.featureLevel)
  const overrides = mitSchalter(
    level,
    parseFeatureOverrides(household.featureOverrides),
    parsed.data.key,
    parsed.data.an,
  )

  await prisma.household.update({
    where: { id: household.id },
    data: { featureOverrides: overrides },
  })
  erneuern()
  return { ok: true }
}

/**
 * Zurueck auf den Auslieferungszustand. Loescht keine Daten – alles
 * Eingetragene bleibt, es wird nur nicht mehr ausgewertet.
 */
export async function resetToProtokollAction(): Promise<Result> {
  const user = await requireUser()
  await prisma.household.update({
    where: { id: user.householdId },
    data: {
      featureLevel: DEFAULT_FEATURE_LEVEL,
      featureOverrides: {},
      featurePauseUntil: null,
    },
  })
  erneuern()
  return { ok: true }
}

const pauseSchema = z.object({ stunden: z.number().int().min(1).max(24 * 90) })

/** Pause: alles Zusaetzliche bis zu einem Zeitpunkt aus. */
export async function startPauseAction(input: z.input<typeof pauseSchema>): Promise<Result> {
  const user = await requireUser()
  const parsed = pauseSchema.safeParse(input)
  if (!parsed.success) return { error: 'Dieser Zeitraum geht nicht.' }

  await prisma.household.update({
    where: { id: user.householdId },
    data: { featurePauseUntil: pauseEnde(parsed.data.stunden) },
  })
  erneuern()
  return { ok: true }
}

/** Pause vorzeitig beenden. */
export async function endPauseAction(): Promise<Result> {
  const user = await requireUser()
  await prisma.household.update({
    where: { id: user.householdId },
    data: { featurePauseUntil: null },
  })
  erneuern()
  return { ok: true }
}

/** Die Erklaerung beim ersten Start wurde gelesen. */
export async function markIntroSeenAction(): Promise<Result> {
  const user = await requireUser()
  await prisma.household.update({
    where: { id: user.householdId },
    data: { introSeenAt: new Date() },
  })
  erneuern()
  return { ok: true }
}
