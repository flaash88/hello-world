import { NEWBORN_EXERCISES } from './newborn'
import { INFANT_EXERCISES } from './infant'
import { CRAWLER_EXERCISES } from './crawler'
import { TODDLER_EXERCISES } from './toddler'
import { PRESCHOOL_EXERCISES } from './preschool'
import { EVERYDAY_EXERCISES } from './everyday'
import { SENSORY_EXERCISES } from './sensory'
import { LANGUAGE_EXERCISES } from './language'
import { MOTOR_EXERCISES } from './motor'
import { CREATIVE_EXERCISES } from './creative'
import type { Exercise, ExerciseArea } from './types'

export * from './types'

/** Alle Übungen, nach Alter sortiert. */
export const EXERCISES: Exercise[] = [
  ...NEWBORN_EXERCISES,
  ...INFANT_EXERCISES,
  ...CRAWLER_EXERCISES,
  ...TODDLER_EXERCISES,
  ...PRESCHOOL_EXERCISES,
  ...EVERYDAY_EXERCISES,
  ...SENSORY_EXERCISES,
  ...LANGUAGE_EXERCISES,
  ...MOTOR_EXERCISES,
  ...CREATIVE_EXERCISES,
].sort((a, b) => a.fromWeeks - b.fromWeeks || a.id.localeCompare(b.id))

const BY_ID = new Map(EXERCISES.map((exercise) => [exercise.id, exercise]))

export function exerciseById(id: string): Exercise | null {
  return BY_ID.get(id) ?? null
}

/** Übungen, die für das angegebene Alter (in Wochen) passen. */
export function exercisesForAge(
  weeks: number,
  filter: { area?: ExerciseArea; maxDurationMin?: number } = {},
): Exercise[] {
  return EXERCISES.filter((exercise) => {
    if (weeks < exercise.fromWeeks || weeks > exercise.toWeeks) return false
    if (filter.area && exercise.area !== filter.area) return false
    if (filter.maxDurationMin && exercise.durationMin > filter.maxDurationMin) return false
    return true
  })
}

/**
 * Vorschlag des Tages: deterministisch aus Alter und Datum, damit beide
 * Elternteile denselben Vorschlag sehen und er sich täglich ändert.
 */
export function exerciseOfTheDay(weeks: number, dayKey: string, doneIds: string[] = []): Exercise | null {
  const candidates = exercisesForAge(weeks)
  if (candidates.length === 0) return null

  const fresh = candidates.filter((exercise) => !doneIds.includes(exercise.id))
  const pool = fresh.length > 0 ? fresh : candidates

  // Einfacher, stabiler Hash über den Tagesschlüssel.
  let hash = 0
  for (const char of dayKey) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return pool[hash % pool.length] ?? null
}
