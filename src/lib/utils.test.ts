import { describe, expect, it } from 'vitest'
import { clamp, cn, groupBy, initialsFrom, mean, median, quantile, sum, withoutOutliers } from './utils'

describe('cn', () => {
  it('fuehrt Klassen zusammen und laesst spaetere gewinnen', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4')
    expect(cn('text-sm', false && 'hidden', 'font-bold')).toBe('text-sm font-bold')
  })
})

describe('initialsFrom', () => {
  it('bildet Initialen', () => {
    expect(initialsFrom('Anna Muster')).toBe('AM')
    expect(initialsFrom('Papa')).toBe('PA')
    expect(initialsFrom('  Maria Anna Huber ')).toBe('MH')
    expect(initialsFrom('')).toBe('??')
  })
})

describe('clamp', () => {
  it('begrenzt Werte', () => {
    expect(clamp(5, 0, 10)).toBe(5)
    expect(clamp(-1, 0, 10)).toBe(0)
    expect(clamp(11, 0, 10)).toBe(10)
  })
})

describe('median', () => {
  it('berechnet den Median', () => {
    expect(median([3, 1, 2])).toBe(2)
    expect(median([4, 1, 2, 3])).toBe(2.5)
    expect(median([])).toBeNull()
  })
})

describe('quantile', () => {
  it('interpoliert linear', () => {
    expect(quantile([1, 2, 3, 4], 0.5)).toBe(2.5)
    expect(quantile([1, 2, 3, 4], 0)).toBe(1)
    expect(quantile([1, 2, 3, 4], 1)).toBe(4)
    expect(quantile([], 0.5)).toBeNull()
  })
})

describe('withoutOutliers', () => {
  it('entfernt einzelne Ausreisser nach der IQR-Regel', () => {
    const values = [60, 62, 65, 61, 63, 64, 300]
    expect(withoutOutliers(values)).not.toContain(300)
    expect(withoutOutliers(values)).toHaveLength(6)
  })

  it('laesst kleine Stichproben unangetastet', () => {
    expect(withoutOutliers([1, 900])).toEqual([1, 900])
  })
})

describe('sum und mean', () => {
  it('rechnet', () => {
    expect(sum([1, 2, 3])).toBe(6)
    expect(mean([2, 4])).toBe(3)
    expect(mean([])).toBeNull()
  })
})

describe('groupBy', () => {
  it('gruppiert nach Schluessel', () => {
    const grouped = groupBy([{ t: 'a' }, { t: 'b' }, { t: 'a' }], (x) => x.t)
    expect(grouped.get('a')).toHaveLength(2)
    expect(grouped.get('b')).toHaveLength(1)
  })
})
