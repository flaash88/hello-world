import { describe, expect, it } from 'vitest'
import { PREGNANCY_WEEKS, pregnancyWeekContent, LAST_CONTENT_WEEK, FIRST_CONTENT_WEEK } from './content'

describe('PREGNANCY_WEEKS', () => {
  it('deckt SSW 4 bis 42 lueckenlos ab', () => {
    expect(FIRST_CONTENT_WEEK).toBe(4)
    expect(LAST_CONTENT_WEEK).toBe(42)
    expect(PREGNANCY_WEEKS).toHaveLength(39)
    PREGNANCY_WEEKS.forEach((entry, index) => {
      expect(entry.week).toBe(4 + index)
    })
  })

  it('hat fuer jede Woche echten Inhalt, keine Platzhalter', () => {
    for (const entry of PREGNANCY_WEEKS) {
      expect(entry.development.length).toBeGreaterThan(120)
      expect(entry.mother.length).toBeGreaterThan(120)
      expect(entry.partnerTip.length).toBeGreaterThan(40)
      expect(entry.comparison.trim().length).toBeGreaterThan(2)
      expect(entry.development).not.toMatch(/TODO|Platzhalter|Lorem/i)
    }
  })

  it('laesst Groesse und Gewicht monoton wachsen', () => {
    const lengths = PREGNANCY_WEEKS.filter((w) => w.lengthCm !== null)
    for (let i = 1; i < lengths.length; i++) {
      const previous = lengths[i - 1]!
      const current = lengths[i]!
      // Beim Wechsel von Scheitel-Steiss auf Scheitel-Ferse ist ein Sprung normal.
      if (previous.lengthKind === current.lengthKind) {
        expect(current.lengthCm!).toBeGreaterThan(previous.lengthCm!)
      } else {
        expect(current.lengthCm!).toBeGreaterThan(previous.lengthCm!)
      }
    }

    const weights = PREGNANCY_WEEKS.filter((w) => w.weightG !== null)
    for (let i = 1; i < weights.length; i++) {
      expect(weights[i]!.weightG!).toBeGreaterThan(weights[i - 1]!.weightG!)
    }
  })

  it('wechselt genau einmal von SSL auf SFL', () => {
    const kinds = PREGNANCY_WEEKS.map((w) => w.lengthKind).filter(Boolean)
    const switches = kinds.filter((kind, i) => i > 0 && kind !== kinds[i - 1])
    expect(switches).toHaveLength(1)
    expect(switches[0]).toBe('sfl')
  })
})

describe('pregnancyWeekContent', () => {
  it('findet vorhandene Wochen', () => {
    expect(pregnancyWeekContent(20)?.week).toBe(20)
  })

  it('liefert null ausserhalb des Bereichs', () => {
    expect(pregnancyWeekContent(2)).toBeNull()
    expect(pregnancyWeekContent(50)).toBeNull()
  })
})
