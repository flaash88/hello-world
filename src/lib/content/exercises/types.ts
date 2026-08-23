/**
 * Entwicklungsübungen.
 *
 * Alle Übungen sind selbst formuliert und bewusst mit Alltagsmaterial
 * gedacht: Was im Haushalt liegt, ist griffbereit; was gekauft werden muss,
 * wird selten benutzt. Die Altersangaben sind Richtwerte in Lebenswochen –
 * entscheidend ist, was das Kind gerade kann, nicht das Datum.
 */

export const EXERCISE_AREAS = ['motorik', 'sinne', 'sprache', 'sozial', 'kognition', 'alltag'] as const
export type ExerciseArea = (typeof EXERCISE_AREAS)[number]

export const AREA_LABEL: Record<ExerciseArea, string> = {
  motorik: 'Bewegung',
  sinne: 'Sinne',
  sprache: 'Sprache',
  sozial: 'Miteinander',
  kognition: 'Denken',
  alltag: 'Alltag',
}

export type Exercise = {
  id: string
  title: string
  /** Empfohlener Altersbereich in Lebenswochen (einschliesslich). */
  fromWeeks: number
  toWeeks: number
  area: ExerciseArea
  /** Wozu die Übung gut ist – ein Satz. */
  goal: string
  /** Benötigtes Material, "Nichts" wenn keines nötig ist. */
  material: string
  /** Anleitung in drei bis fünf Schritten. */
  steps: string[]
  /** Ungefähre Dauer in Minuten. */
  durationMin: number
}
