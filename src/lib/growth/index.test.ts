import { describe, expect, it } from 'vitest'
import {
  CURVE_PERCENTILES,
  LENGTH_HEIGHT_TRANSITION_DAY,
  bmiOf,
  describePercentile,
  evaluateGrowth,
  growthCurves,
  maxAgeDays,
  shortPercentile,
} from './index'

/**
 * Referenzwerte aus den offiziellen WHO-Tabellen (Weight-for-age,
 * Length-for-age, Head-circumference-for-age). Sie sind die eigentliche
 * Absicherung: Wenn die Rechnung stimmt, treffen die Mediane exakt.
 */
describe('WHO-Referenzwerte', () => {
  it('trifft den Geburtsmedian beim Gewicht', () => {
    // WHO: Median Geburtsgewicht 3,3464 kg (Jungen), 3,2322 kg (Mädchen)
    expect(evaluateGrowth('weight', 'male', 3.3464, 0).median).toBeCloseTo(3.3464, 3)
    expect(evaluateGrowth('weight', 'female', 3.2322, 0).median).toBeCloseTo(3.2322, 3)
    expect(evaluateGrowth('weight', 'male', 3.3464, 0).percentile).toBeCloseTo(50, 4)
  })

  it('trifft den Geburtsmedian bei der Länge', () => {
    // WHO: Median Geburtslänge 49,8842 cm (Jungen), 49,1477 cm (Mädchen)
    expect(evaluateGrowth('length', 'male', 49.8842, 0).median).toBeCloseTo(49.88, 1)
    expect(evaluateGrowth('length', 'female', 49.1477, 0).median).toBeCloseTo(49.15, 1)
  })

  it('trifft den Geburtsmedian beim Kopfumfang', () => {
    // WHO: Median Kopfumfang bei Geburt 34,4618 cm (Jungen), 33,8787 cm (Mädchen)
    expect(evaluateGrowth('head', 'male', 34.4618, 0).median).toBeCloseTo(34.46, 1)
    expect(evaluateGrowth('head', 'female', 33.8787, 0).median).toBeCloseTo(33.88, 1)
  })

  it('rechnet ein bekanntes Beispiel korrekt', () => {
    // Mädchen, 279 Tage, 8,9 kg -> z etwa 0,60, Perzentil etwa 72,6
    const result = evaluateGrowth('weight', 'female', 8.9, 279)
    expect(result.zScore).toBeCloseTo(0.599, 2)
    expect(result.percentile).toBeCloseTo(72.55, 1)
    expect(result.median).toBeCloseTo(8.269, 2)
  })

  it('deckt 0 bis 5 Jahre ab', () => {
    expect(maxAgeDays('weight', 'female')).toBe(1856)
    expect(maxAgeDays('head', 'male')).toBe(1856)
  })

  it('meldet ehrlich, wenn das Alter ausserhalb der Tabelle liegt', () => {
    expect(evaluateGrowth('weight', 'female', 20, 2500).outOfRange).toBe(true)
    expect(evaluateGrowth('weight', 'female', 8, 300).outOfRange).toBe(false)
  })
})

describe('evaluateGrowth', () => {
  it('ordnet ueber und unter dem Median richtig ein', () => {
    const median = evaluateGrowth('weight', 'female', 8.269, 279)
    const heavy = evaluateGrowth('weight', 'female', 10, 279)
    const light = evaluateGrowth('weight', 'female', 7, 279)

    expect(median.percentile).toBeCloseTo(50, 0)
    expect(heavy.percentile).toBeGreaterThan(median.percentile)
    expect(light.percentile).toBeLessThan(median.percentile)
  })

  it('unterscheidet Jungen und Maedchen', () => {
    const boy = evaluateGrowth('weight', 'male', 8.9, 279)
    const girl = evaluateGrowth('weight', 'female', 8.9, 279)
    expect(boy.percentile).not.toBeCloseTo(girl.percentile, 1)
    // Jungen sind im Median schwerer, dasselbe Gewicht liegt also niedriger.
    expect(boy.percentile).toBeLessThan(girl.percentile)
  })

  it('laesst den Median mit dem Alter wachsen', () => {
    const ages = [0, 30, 90, 180, 365, 730, 1095]
    for (let i = 1; i < ages.length; i++) {
      expect(evaluateGrowth('weight', 'female', 5, ages[i]!).median).toBeGreaterThan(
        evaluateGrowth('weight', 'female', 5, ages[i - 1]!).median,
      )
    }
  })
})

describe('growthCurves', () => {
  it('liefert alle Perzentilkurven', () => {
    const points = growthCurves('weight', 'female', 0, 365)
    expect(points.length).toBeGreaterThan(10)
    for (const percentile of CURVE_PERCENTILES) {
      expect(points[0]).toHaveProperty(`p${percentile}`)
    }
  })

  it('sortiert die Kurven aufsteigend', () => {
    for (const point of growthCurves('weight', 'male', 0, 730)) {
      expect(point.p3!).toBeLessThan(point.p15!)
      expect(point.p15!).toBeLessThan(point.p50!)
      expect(point.p50!).toBeLessThan(point.p85!)
      expect(point.p85!).toBeLessThan(point.p97!)
    }
  })

  it('laesst jede Kurve mit dem Alter wachsen', () => {
    const points = growthCurves('length', 'female', 0, 700)
    for (let i = 1; i < points.length; i++) {
      expect(points[i]!.p50!).toBeGreaterThan(points[i - 1]!.p50!)
    }
  })

  it('bildet den Wechsel von Liege- auf Stehmessung mit 24 Monaten ab', () => {
    // Die WHO misst ab 24 Monaten im Stehen; die Referenz faellt dort um
    // rund 0,7 cm. Das gehoert so und darf nicht "geglaettet" werden.
    const before = evaluateGrowth('length', 'female', 85, LENGTH_HEIGHT_TRANSITION_DAY - 1).median
    const after = evaluateGrowth('length', 'female', 85, LENGTH_HEIGHT_TRANSITION_DAY).median
    expect(before - after).toBeCloseTo(0.67, 1)
  })

  it('begrenzt auf den abgedeckten Altersbereich', () => {
    const points = growthCurves('weight', 'female', 0, 5000)
    expect(points[points.length - 1]!.ageDays).toBeLessThanOrEqual(1856)
  })

  it('trifft mit P50 den Median', () => {
    const points = growthCurves('weight', 'female', 279, 280, 1)
    const direct = evaluateGrowth('weight', 'female', 8, 279).median
    expect(points[0]!.p50!).toBeCloseTo(direct, 3)
  })
})

describe('bmiOf', () => {
  it('rechnet Gewicht und Laenge in BMI um', () => {
    expect(bmiOf(8.9, 70)).toBeCloseTo(18.16, 2)
  })

  it('lehnt unsinnige Werte ab', () => {
    expect(bmiOf(0, 70)).toBeNull()
    expect(bmiOf(8.9, 0)).toBeNull()
  })
})

describe('Perzentil-Beschriftung', () => {
  it('formuliert wertfrei', () => {
    expect(describePercentile(50)).toBe('auf dem 50. Perzentil')
    expect(describePercentile(0.4)).toBe('unter dem 1. Perzentil')
    expect(describePercentile(99.7)).toBe('über dem 99. Perzentil')
    expect(describePercentile(Number.NaN)).toBe('nicht berechenbar')
  })

  it('kuerzt fuer kompakte Anzeigen', () => {
    expect(shortPercentile(50.4)).toBe('P50')
    expect(shortPercentile(1)).toBe('< P3')
    expect(shortPercentile(99)).toBe('> P97')
    expect(shortPercentile(Number.NaN)).toBe('–')
  })
})
