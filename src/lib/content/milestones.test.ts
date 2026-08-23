import { describe, expect, it } from 'vitest'
import {
  MILESTONES,
  MILESTONE_CATEGORIES,
  milestoneByKey,
  milestonesForAge,
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

describe('Sprachregister', () => {
  it('kennt keine Faelligkeit und keine Wertung', () => {
    for (const milestone of MILESTONES) {
      expect(milestone).not.toHaveProperty('concernAfterWeeks')
      expect(milestone.description).not.toMatch(/sollte|muss|überfällig|zu spät|Defizit/i)
      expect(milestone.description).not.toMatch(/!/)
    }
  })
})
