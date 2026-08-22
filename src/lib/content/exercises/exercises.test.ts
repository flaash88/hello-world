import { describe, expect, it } from 'vitest'
import { EXERCISES, exerciseById, exerciseOfTheDay, exercisesForAge } from './index'
import { EXERCISE_AREAS } from './types'

describe('EXERCISES', () => {
  it('enthält mindestens 230 Übungen', () => {
    expect(EXERCISES.length).toBeGreaterThanOrEqual(230)
  })

  it('hat eindeutige Schlüssel', () => {
    const ids = EXERCISES.map((exercise) => exercise.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('hat für jede Übung vollständigen Inhalt', () => {
    for (const exercise of EXERCISES) {
      expect(exercise.title.length).toBeGreaterThan(3)
      expect(exercise.goal.length).toBeGreaterThan(20)
      expect(exercise.material.length).toBeGreaterThan(3)
      expect(exercise.steps.length).toBeGreaterThanOrEqual(3)
      expect(exercise.steps.length).toBeLessThanOrEqual(5)
      for (const step of exercise.steps) expect(step.length).toBeGreaterThan(15)
      expect(exercise.durationMin).toBeGreaterThan(0)
      expect(exercise.fromWeeks).toBeLessThan(exercise.toWeeks)
      expect(EXERCISE_AREAS).toContain(exercise.area)
    }
  })

  it('deckt jede Woche von 0 bis 156 ab', () => {
    for (let week = 0; week <= 156; week += 1) {
      expect(exercisesForAge(week).length).toBeGreaterThan(0)
    }
  })

  it('deckt jeden Bereich ab', () => {
    for (const area of EXERCISE_AREAS) {
      expect(EXERCISES.some((exercise) => exercise.area === area)).toBe(true)
    }
  })
})

describe('exercisesForAge', () => {
  it('filtert nach Alter', () => {
    for (const exercise of exercisesForAge(30)) {
      expect(exercise.fromWeeks).toBeLessThanOrEqual(30)
      expect(exercise.toWeeks).toBeGreaterThanOrEqual(30)
    }
  })

  it('filtert nach Bereich und Dauer', () => {
    const filtered = exercisesForAge(60, { area: 'sprache', maxDurationMin: 8 })
    expect(filtered.length).toBeGreaterThan(0)
    for (const exercise of filtered) {
      expect(exercise.area).toBe('sprache')
      expect(exercise.durationMin).toBeLessThanOrEqual(8)
    }
  })
})

describe('exerciseOfTheDay', () => {
  it('ist für denselben Tag stabil', () => {
    const a = exerciseOfTheDay(30, '2026-11-15')
    const b = exerciseOfTheDay(30, '2026-11-15')
    expect(a?.id).toBe(b?.id)
  })

  it('ändert sich über die Tage', () => {
    const picks = new Set(
      ['2026-11-15', '2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19'].map(
        (day) => exerciseOfTheDay(30, day)?.id,
      ),
    )
    expect(picks.size).toBeGreaterThan(1)
  })

  it('bevorzugt noch nicht gemachte Übungen', () => {
    const all = exercisesForAge(30)
    const done = all.slice(0, all.length - 1).map((exercise) => exercise.id)
    const pick = exerciseOfTheDay(30, '2026-11-15', done)
    expect(pick?.id).toBe(all[all.length - 1]!.id)
  })

  it('fällt auf alle zurück, wenn schon alles gemacht wurde', () => {
    const all = exercisesForAge(30).map((exercise) => exercise.id)
    expect(exerciseOfTheDay(30, '2026-11-15', all)).not.toBeNull()
  })

  it('liefert nur passende Übungen', () => {
    const pick = exerciseOfTheDay(8, '2026-11-15')!
    expect(pick.fromWeeks).toBeLessThanOrEqual(8)
    expect(pick.toWeeks).toBeGreaterThanOrEqual(8)
  })
})

describe('exerciseById', () => {
  it('findet und verfehlt korrekt', () => {
    expect(exerciseById(EXERCISES[0]!.id)?.id).toBe(EXERCISES[0]!.id)
    expect(exerciseById('gibt-es-nicht')).toBeNull()
  })
})
