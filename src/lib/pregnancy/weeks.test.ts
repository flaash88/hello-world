import { describe, expect, it } from 'vitest'
import { startOfLocalDay } from '@/lib/time'
import {
  GESTATION_DAYS,
  dueDateFromLastPeriod,
  gestationalAge,
  lastPeriodFromDueDate,
  startOfGestationalWeek,
  TRIMESTERS,
} from './weeks'

const TZ = 'Europe/Vienna'
const DUE = new Date('2026-10-28T00:00:00Z')

describe('Naegele-Regel', () => {
  it('rechnet vom ersten Tag der letzten Periode 280 Tage weiter', () => {
    const lastPeriod = new Date('2026-01-21T00:00:00Z')
    const due = dueDateFromLastPeriod(lastPeriod, TZ)
    expect(Math.round((due.getTime() - lastPeriod.getTime()) / 86400000)).toBe(GESTATION_DAYS)
  })

  it('ist umkehrbar und normalisiert auf Mitternacht Ortszeit', () => {
    const lastPeriod = lastPeriodFromDueDate(DUE, TZ)
    const back = dueDateFromLastPeriod(lastPeriod, TZ)
    // Der ET ist ein Kalendertag, kein Zeitpunkt – deshalb 00:00 Ortszeit.
    expect(back.getTime()).toBe(startOfLocalDay(DUE, TZ).getTime())
  })
})

describe('gestationalAge', () => {
  it('liefert am ET genau 40+0', () => {
    const age = gestationalAge(DUE, DUE, TZ)
    expect(age.week).toBe(40)
    expect(age.day).toBe(0)
    expect(age.daysToDue).toBe(0)
    expect(age.overdue).toBe(false)
    expect(age.label).toBe('40+0')
  })

  it('zaehlt Wochen und Tage getrennt', () => {
    const at = new Date('2026-06-10T12:00:00Z')
    const age = gestationalAge(DUE, at, TZ)
    expect(age.totalDays).toBe(age.week * 7 + age.day)
    expect(age.day).toBeGreaterThanOrEqual(0)
    expect(age.day).toBeLessThanOrEqual(6)
  })

  it('erkennt eine Uebertragung', () => {
    const at = new Date('2026-11-02T12:00:00Z')
    const age = gestationalAge(DUE, at, TZ)
    expect(age.overdue).toBe(true)
    expect(age.daysToDue).toBeLessThan(0)
    expect(age.week).toBeGreaterThanOrEqual(40)
  })

  it('teilt die Trimester korrekt ein', () => {
    const weekAt = (week: number) => startOfGestationalWeek(DUE, week, TZ)
    expect(gestationalAge(DUE, weekAt(8), TZ).trimester).toBe(1)
    expect(gestationalAge(DUE, weekAt(13), TZ).trimester).toBe(1)
    expect(gestationalAge(DUE, weekAt(14), TZ).trimester).toBe(2)
    expect(gestationalAge(DUE, weekAt(27), TZ).trimester).toBe(2)
    expect(gestationalAge(DUE, weekAt(28), TZ).trimester).toBe(3)
    expect(gestationalAge(DUE, weekAt(40), TZ).trimester).toBe(3)
  })

  it('deckelt den Fortschritt bei 1 und wird nie negativ', () => {
    expect(gestationalAge(DUE, new Date('2026-12-01T00:00:00Z'), TZ).progress).toBe(1)
    const early = gestationalAge(DUE, new Date('2025-12-01T00:00:00Z'), TZ)
    expect(early.progress).toBe(0)
    expect(early.week).toBe(0)
  })

  it('haelt die Woche ueber die Zeitumstellung stabil', () => {
    // Sommerzeitende 2026: 25. Oktober. Der Tageswechsel darf nicht springen.
    const before = gestationalAge(DUE, new Date('2026-10-24T12:00:00Z'), TZ)
    const after = gestationalAge(DUE, new Date('2026-10-26T12:00:00Z'), TZ)
    expect(after.totalDays - before.totalDays).toBe(2)
  })
})

describe('startOfGestationalWeek', () => {
  it('liefert fuer Woche 40 den ET', () => {
    expect(startOfGestationalWeek(DUE, 40, TZ).getTime()).toBe(startOfLocalDay(DUE, TZ).getTime())
  })

  it('liegt sieben Tage zwischen zwei Wochen', () => {
    const w20 = startOfGestationalWeek(DUE, 20, TZ)
    const w21 = startOfGestationalWeek(DUE, 21, TZ)
    expect(Math.round((w21.getTime() - w20.getTime()) / 86400000)).toBe(7)
  })
})

describe('TRIMESTERS', () => {
  it('deckt die Wochen 0 bis 42 lueckenlos ab', () => {
    expect(TRIMESTERS[0]!.fromWeek).toBe(0)
    expect(TRIMESTERS[2]!.toWeek).toBe(42)
    for (let i = 1; i < TRIMESTERS.length; i++) {
      expect(TRIMESTERS[i]!.fromWeek).toBe(TRIMESTERS[i - 1]!.toWeek + 1)
    }
  })
})
