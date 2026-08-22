import { describe, expect, it } from 'vitest'
import {
  lmsToZScore,
  lookupLms,
  percentileToZScore,
  zScoreToPercentile,
  zScoreToValue,
  type LmsTable,
} from './lms'

const TABLE: LmsTable = {
  indicator: 'test',
  sex: 'female',
  xAxis: 'day',
  start: 0,
  step: 1,
  lms: [
    [1, 10, 0.1],
    [1, 20, 0.2],
    [1, 30, 0.3],
  ],
}

describe('lmsToZScore und zScoreToValue', () => {
  it('liefert beim Median z = 0', () => {
    expect(lmsToZScore(3.2322, { l: 0.3809, m: 3.2322, s: 0.14171 })).toBeCloseTo(0, 10)
  })

  it('ist zueinander invers (L ungleich 0)', () => {
    const point = { l: 0.3809, m: 3.2322, s: 0.14171 }
    for (const z of [-3, -1.5, -0.5, 0, 0.5, 1.5, 3]) {
      expect(lmsToZScore(zScoreToValue(z, point), point)).toBeCloseTo(z, 8)
    }
  })

  it('ist zueinander invers (L gleich 0, logarithmischer Fall)', () => {
    const point = { l: 0, m: 8.5, s: 0.12 }
    for (const z of [-2, 0, 2]) {
      expect(lmsToZScore(zScoreToValue(z, point), point)).toBeCloseTo(z, 10)
    }
  })

  it('liefert NaN fuer unsinnige Eingaben', () => {
    expect(lmsToZScore(0, { l: 1, m: 10, s: 0.1 })).toBeNaN()
    expect(lmsToZScore(-5, { l: 1, m: 10, s: 0.1 })).toBeNaN()
  })

  it('waechst monoton mit dem Messwert', () => {
    const point = { l: 0.3809, m: 3.2322, s: 0.14171 }
    expect(lmsToZScore(3.0, point)).toBeLessThan(lmsToZScore(3.5, point))
  })
})

describe('zScoreToPercentile', () => {
  it('trifft die Standardwerte der Normalverteilung', () => {
    expect(zScoreToPercentile(0)).toBeCloseTo(50, 6)
    expect(zScoreToPercentile(1)).toBeCloseTo(84.134, 2)
    expect(zScoreToPercentile(-1)).toBeCloseTo(15.866, 2)
    expect(zScoreToPercentile(1.96)).toBeCloseTo(97.5, 2)
    expect(zScoreToPercentile(-2)).toBeCloseTo(2.275, 2)
    expect(zScoreToPercentile(3)).toBeCloseTo(99.865, 2)
  })

  it('ist symmetrisch um 50', () => {
    for (const z of [0.5, 1, 2, 2.5]) {
      expect(zScoreToPercentile(z) + zScoreToPercentile(-z)).toBeCloseTo(100, 4)
    }
  })

  it('liefert NaN fuer NaN', () => {
    expect(zScoreToPercentile(Number.NaN)).toBeNaN()
  })
})

describe('percentileToZScore', () => {
  it('trifft die Standardwerte', () => {
    expect(percentileToZScore(50)).toBeCloseTo(0, 6)
    expect(percentileToZScore(97.5)).toBeCloseTo(1.96, 3)
    expect(percentileToZScore(2.5)).toBeCloseTo(-1.96, 3)
    expect(percentileToZScore(3)).toBeCloseTo(-1.881, 2)
    expect(percentileToZScore(97)).toBeCloseTo(1.881, 2)
  })

  it('ist die Umkehrung von zScoreToPercentile', () => {
    for (const z of [-2.5, -1, 0, 1, 2.5]) {
      expect(percentileToZScore(zScoreToPercentile(z))).toBeCloseTo(z, 3)
    }
  })

  it('liefert NaN ausserhalb von 0 bis 100', () => {
    expect(percentileToZScore(0)).toBeNaN()
    expect(percentileToZScore(100)).toBeNaN()
  })
})

describe('lookupLms', () => {
  it('trifft die Stuetzstellen exakt', () => {
    expect(lookupLms(TABLE, 1)).toMatchObject({ l: 1, m: 20, s: 0.2, clamped: false })
  })

  it('interpoliert linear dazwischen', () => {
    const point = lookupLms(TABLE, 1.5)
    expect(point.m).toBeCloseTo(25, 10)
    expect(point.s).toBeCloseTo(0.25, 10)
  })

  it('klemmt unterhalb der Tabelle und meldet es', () => {
    expect(lookupLms(TABLE, -5)).toMatchObject({ m: 10, clamped: true })
    expect(lookupLms(TABLE, 0)).toMatchObject({ m: 10, clamped: false })
  })

  it('klemmt oberhalb der Tabelle und meldet es', () => {
    expect(lookupLms(TABLE, 99)).toMatchObject({ m: 30, clamped: true })
    expect(lookupLms(TABLE, 2)).toMatchObject({ m: 30, clamped: false })
  })
})
