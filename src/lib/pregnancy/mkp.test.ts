import { describe, expect, it } from 'vitest'
import { MKP_EXAMS, mkpScheduleFor } from './mkp'
import { gestationalAge } from './weeks'

const TZ = 'Europe/Vienna'
const DUE = new Date('2026-10-28T00:00:00Z')

describe('MKP_EXAMS', () => {
  it('hat eindeutige Schluessel', () => {
    const keys = MKP_EXAMS.map((e) => e.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('hat plausible Zeitfenster', () => {
    for (const exam of MKP_EXAMS) {
      expect(exam.fromWeek).toBeLessThanOrEqual(exam.toWeek)
      expect(exam.fromWeek).toBeGreaterThanOrEqual(0)
      expect(exam.toWeek).toBeLessThanOrEqual(42)
      expect(exam.description.length).toBeGreaterThan(40)
    }
  })
})

describe('mkpScheduleFor', () => {
  it('erzeugt fuer jede Untersuchung ein Zeitfenster', () => {
    const schedule = mkpScheduleFor(DUE, TZ)
    expect(schedule).toHaveLength(MKP_EXAMS.length)
    for (const entry of schedule) {
      expect(entry.windowFrom.getTime()).toBeLessThan(entry.windowTo.getTime())
    }
  })

  it('legt die Fenster auf die angegebenen Schwangerschaftswochen', () => {
    const schedule = mkpScheduleFor(DUE, TZ)
    const ogtt = schedule.find((e) => e.exam.key === 'ogtt')!
    expect(gestationalAge(DUE, ogtt.windowFrom, TZ).week).toBe(24)
    // Das Fenster endet mit dem Ende der Zielwoche.
    expect(gestationalAge(DUE, new Date(ogtt.windowTo.getTime() - 86400000), TZ).week).toBe(28)
  })
})
