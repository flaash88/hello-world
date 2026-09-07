import { describe, expect, it } from 'vitest'
import { EKP_EXAMS, OFFICIAL_EKP_EXAMS, ekpScheduleFor } from './ekp'
import { gestationalAge } from './weeks'

const TZ = 'Europe/Vienna'
const DUE = new Date('2026-10-28T00:00:00Z')

describe('EKP_EXAMS', () => {
  it('hat eindeutige Schluessel', () => {
    const keys = EKP_EXAMS.map((e) => e.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('hat plausible Zeitfenster', () => {
    for (const exam of EKP_EXAMS) {
      expect(exam.fromWeek).toBeLessThanOrEqual(exam.toWeek)
      expect(exam.fromWeek).toBeGreaterThanOrEqual(0)
      expect(exam.toWeek).toBeLessThanOrEqual(42)
      expect(exam.description.length).toBeGreaterThan(40)
    }
  })
})

describe('ekpScheduleFor', () => {
  it('erzeugt fuer jede Untersuchung ein Zeitfenster', () => {
    const schedule = ekpScheduleFor(DUE, TZ)
    expect(schedule).toHaveLength(EKP_EXAMS.length)
    for (const entry of schedule) {
      expect(entry.windowFrom.getTime()).toBeLessThan(entry.windowTo.getTime())
    }
  })

  it('legt die Fenster auf die angegebenen Schwangerschaftswochen', () => {
    const schedule = ekpScheduleFor(DUE, TZ)
    const ogtt = schedule.find((e) => e.exam.key === 'ogtt')!
    expect(gestationalAge(DUE, ogtt.windowFrom, TZ).week).toBe(24)
    // Das Fenster endet mit dem Ende der Zielwoche.
    expect(gestationalAge(DUE, new Date(ogtt.windowTo.getTime() - 86400000), TZ).week).toBe(28)
  })
})

describe('Eltern-Kind-Pass – Programmumfang', () => {
  it('kennt genau fünf offizielle Untersuchungen der Mutter', () => {
    expect(OFFICIAL_EKP_EXAMS).toHaveLength(5)
    expect(OFFICIAL_EKP_EXAMS.map((exam) => exam.nummer)).toEqual([1, 2, 3, 4, 5])
  })

  it('markiert Zusatztermine nicht als Teil des Programms', () => {
    const extra = EKP_EXAMS.filter((exam) => !exam.official)
    expect(extra.length).toBeGreaterThan(0)
    for (const exam of extra) expect(exam.nummer).toBeUndefined()
  })

  it('nennt den Pass beim heutigen Namen', () => {
    const source = EKP_EXAMS.map((exam) => `${exam.title} ${exam.description}`).join(' ')
    expect(source).not.toMatch(/Mutter-Kind-Pass/)
  })
})
