import { describe, expect, it } from 'vitest'
import {
  MILESTONES,
  MILESTONE_CATEGORIES,
  milestoneByKey,
  milestonesForAge,
  overdueMilestones,
} from './milestones'

describe('MILESTONES', () => {
  it('hat eindeutige Schlüssel', () => {
    const keys = MILESTONES.map((milestone) => milestone.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('hat plausible Zeitfenster und Beschreibungen', () => {
    for (const milestone of MILESTONES) {
      expect(milestone.fromWeeks).toBeLessThanOrEqual(milestone.toWeeks)
      expect(milestone.description.length).toBeGreaterThan(15)
      expect(MILESTONE_CATEGORIES).toContain(milestone.category)
      if (milestone.concernAfterWeeks !== undefined) {
        expect(milestone.concernAfterWeeks).toBeGreaterThanOrEqual(milestone.toWeeks)
      }
    }
  })

  it('deckt alle Kategorien ab', () => {
    for (const category of MILESTONE_CATEGORIES) {
      expect(MILESTONES.some((milestone) => milestone.category === category)).toBe(true)
    }
  })

  it('enthält die klassischen Meilensteine', () => {
    for (const key of ['erstes-laecheln', 'erster-zahn', 'erstes-wort', 'erste-schritte']) {
      expect(milestoneByKey(key)).not.toBeNull()
    }
  })
})

describe('milestonesForAge', () => {
  it('liefert das aktuelle und das nahe Fenster', () => {
    const result = milestonesForAge(20)
    expect(result.length).toBeGreaterThan(0)
    for (const milestone of result) {
      expect(milestone.toWeeks).toBeGreaterThanOrEqual(20)
    }
  })

  it('lässt längst vergangene Fenster weg', () => {
    expect(milestonesForAge(150).some((m) => m.key === 'erstes-laecheln')).toBe(false)
  })
})

describe('overdueMilestones', () => {
  it('meldet nur Meilensteine mit Sorgengrenze', () => {
    const overdue = overdueMilestones(80, [])
    expect(overdue.length).toBeGreaterThan(0)
    for (const milestone of overdue) {
      expect(milestone.concernAfterWeeks).toBeDefined()
    }
  })

  it('lässt bereits erreichte weg', () => {
    const all = overdueMilestones(80, [])
    const withOne = overdueMilestones(80, [all[0]!.key])
    expect(withOne).toHaveLength(all.length - 1)
  })

  it('meldet bei einem jungen Kind nichts', () => {
    expect(overdueMilestones(4, [])).toHaveLength(0)
  })
})
