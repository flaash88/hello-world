/**
 * Zod-Schemas fuer die typisierten Payloads. Jeder Schreibpfad (Server Action,
 * Offline-Queue, Import) validiert damit – die DB-Spalte ist JSON, die
 * Typsicherheit kommt von hier.
 */
import { z } from 'zod'
import {
  BOTTLE_CONTENTS,
  DIAPER_KINDS,
  EVENT_TYPES,
  HEALTH_KINDS,
  MOOD_REASONS,
  NURSING_SIDES,
  OTHER_KINDS,
  SLEEP_AIDS,
  SLEEP_KINDS,
  SLEEP_LOCATIONS,
  STOOL_COLORS,
  STOOL_TEXTURES,
  type EventType,
} from './types'

const stoolColorValues = STOOL_COLORS.map((c) => c.value) as [string, ...string[]]
const stoolTextureValues = STOOL_TEXTURES.map((t) => t.value) as [string, ...string[]]

export const sleepPayload = z.object({
  kind: z.enum(SLEEP_KINDS).default('nap'),
  location: z.enum(SLEEP_LOCATIONS).optional(),
  aid: z.enum(SLEEP_AIDS).optional(),
  /** Zeit vom Hinlegen bis zum Einschlafen, in Sekunden. */
  fallAsleepSec: z.number().int().min(0).max(4 * 3600).optional(),
  /** Anzahl der Nachtwachen innerhalb dieses Schlafblocks. */
  wakeCount: z.number().int().min(0).max(50).optional(),
})

export const nursingPayload = z.object({
  side: z.enum(NURSING_SIDES).default('left'),
  leftSec: z.number().int().min(0).max(4 * 3600).optional(),
  rightSec: z.number().int().min(0).max(4 * 3600).optional(),
})

export const bottlePayload = z.object({
  content: z.enum(BOTTLE_CONTENTS).default('formula'),
  amountMl: z.number().min(0).max(500).optional(),
  leftoverMl: z.number().min(0).max(500).optional(),
})

export const pumpingPayload = z.object({
  side: z.enum(NURSING_SIDES).default('both'),
  amountMl: z.number().min(0).max(1000).optional(),
  leftMl: z.number().min(0).max(500).optional(),
  rightMl: z.number().min(0).max(500).optional(),
})

export const solidsPayload = z.object({
  foods: z.array(z.string().trim().min(1).max(60)).min(1, 'Bitte mindestens ein Lebensmittel angeben.').max(15),
  amount: z.enum(['taste', 'little', 'half', 'full']).optional(),
  reaction: z.enum(['liked', 'neutral', 'refused', 'reaction']).optional(),
  /** Erstes Mal fuer mindestens eines der Lebensmittel. */
  firstTime: z.boolean().optional(),
  reactionNote: z.string().max(300).optional(),
})

export const diaperPayload = z.object({
  kind: z.enum(DIAPER_KINDS).default('wet'),
  color: z.enum(stoolColorValues).optional(),
  texture: z.enum(stoolTextureValues).optional(),
  leaked: z.boolean().optional(),
  cream: z.boolean().optional(),
})

export const moodPayload = z.object({
  intensity: z.number().int().min(1).max(5).default(3),
  reason: z.enum(MOOD_REASONS).optional(),
  soothedBy: z.string().max(120).optional(),
})

export const healthPayload = z.object({
  kind: z.enum(HEALTH_KINDS).default('temperature'),
  temperatureC: z.number().min(30).max(45).optional(),
  measuredAt: z.enum(['rectal', 'ear', 'forehead', 'armpit']).optional(),
  medication: z.string().max(80).optional(),
  doseMg: z.number().min(0).max(5000).optional(),
  doseMl: z.number().min(0).max(200).optional(),
  /** Wiederholungsintervall in Stunden – daraus entsteht eine Erinnerung. */
  repeatHours: z.number().min(0.5).max(48).optional(),
  symptom: z.string().max(120).optional(),
  vaccine: z.string().max(120).optional(),
})

export const otherPayload = z.object({
  kind: z.enum(OTHER_KINDS).default('note'),
  label: z.string().max(120).optional(),
})

export const PAYLOAD_SCHEMAS = {
  sleep: sleepPayload,
  nursing: nursingPayload,
  bottle: bottlePayload,
  pumping: pumpingPayload,
  solids: solidsPayload,
  diaper: diaperPayload,
  mood: moodPayload,
  health: healthPayload,
  other: otherPayload,
} as const satisfies Record<EventType, z.ZodTypeAny>

export type PayloadFor<T extends EventType> = z.infer<(typeof PAYLOAD_SCHEMAS)[T]>
export type AnyPayload = { [K in EventType]: PayloadFor<K> }[EventType]

/** Validiert eine Payload gegen das Schema ihres Typs. */
export function parsePayload(
  type: EventType,
  payload: unknown,
): { ok: true; data: AnyPayload } | { ok: false; error: string } {
  const result = PAYLOAD_SCHEMAS[type].safeParse(payload ?? {})
  if (!result.success) {
    return { ok: false, error: result.error.issues[0]?.message ?? 'Eingabe ungültig.' }
  }
  return { ok: true, data: result.data as AnyPayload }
}

const isoDate = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), 'Zeitpunkt ist kein gültiges Datum.')

/** Gemeinsames Schema fuer Anlegen und Bearbeiten eines Events. */
export const eventInputSchema = z
  .object({
    type: z.enum(EVENT_TYPES),
    startedAt: isoDate,
    endedAt: isoDate.nullable().optional(),
    payload: z.unknown().optional(),
    note: z.string().max(2000).optional(),
    /** Idempotenzschluessel der Offline-Queue. */
    clientId: z.string().max(64).optional(),
  })
  .refine(
    (v) => !v.endedAt || Date.parse(v.endedAt) >= Date.parse(v.startedAt),
    { message: 'Das Ende darf nicht vor dem Beginn liegen.', path: ['endedAt'] },
  )
  .refine(
    (v) => Date.parse(v.startedAt) <= Date.now() + 5 * 60_000,
    { message: 'Der Beginn darf nicht in der Zukunft liegen.', path: ['startedAt'] },
  )

export type EventInput = z.infer<typeof eventInputSchema>
