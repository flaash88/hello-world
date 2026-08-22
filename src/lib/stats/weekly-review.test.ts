import { describe, expect, it } from 'vitest'
import { buildWeeklyReview } from './weekly-review'
import type { StatsBundle } from './queries'

function bundle(overrides: Partial<StatsBundle> = {}): StatsBundle {
  return {
    from: new Date('2026-11-09T00:00:00Z'),
    to: new Date('2026-11-16T00:00:00Z'),
    period: 'week',
    sleep: {
      totalMin: 4200,
      longestBlockMin: 300,
      blocks: 28,
      naps: 21,
      nightMin: 2800,
      wakeCount: 9,
      avgFallAsleepMin: 12,
      medianWakeWindowMin: 95,
    },
    feeding: {
      nursingCount: 35,
      nursingMin: 700,
      bottleCount: 7,
      bottleMl: 840,
      pumpingCount: 4,
      pumpingMl: 400,
      solidsCount: 3,
      mealCount: 45,
      medianIntervalMin: 180,
      byDaypart: [],
    },
    diapers: { total: 42, wet: 24, dirty: 12, both: 6, notable: [], perDay: 6 },
    daily: [],
    heatmap: [],
    eventCount: 129,
    ...overrides,
  }
}

describe('buildWeeklyReview', () => {
  it('meldet ehrlich, wenn nichts eingetragen wurde', () => {
    const lines = buildWeeklyReview(bundle({ eventCount: 0 }), null, 'Lina')
    expect(lines).toHaveLength(1)
    expect(lines[0]).toContain('nichts eingetragen')
  })

  it('beschreibt Schlaf, Fütterung und Windeln', () => {
    const lines = buildWeeklyReview(bundle(), null, 'Lina').join(' ')
    expect(lines).toContain('Lina')
    expect(lines).toContain('geschlafen')
    expect(lines).toContain('Mahlzeiten')
    expect(lines).toContain('Windeln')
  })

  it('nennt einen Trend nur bei deutlicher Veraenderung', () => {
    const previous = bundle({ sleep: { ...bundle().sleep, totalMin: 4300 } })
    const noTrend = buildWeeklyReview(bundle(), previous, 'Lina').join(' ')
    expect(noTrend).not.toContain('Vorwoche')

    const clearlyLess = bundle({ sleep: { ...bundle().sleep, totalMin: 3200 } })
    const withTrend = buildWeeklyReview(clearlyLess, previous, 'Lina').join(' ')
    expect(withTrend).toContain('Vorwoche')
  })

  it('erwaehnt ein veraendertes Wachfenster', () => {
    const previous = bundle({ sleep: { ...bundle().sleep, medianWakeWindowMin: 70 } })
    const lines = buildWeeklyReview(bundle(), previous, 'Lina').join(' ')
    expect(lines).toContain('Wachfenster ist länger geworden')
  })

  it('hebt auffaellige Windelbefunde hervor', () => {
    const lines = buildWeeklyReview(
      bundle({ diapers: { ...bundle().diapers, notable: [{ color: 'red', count: 2 }] } }),
      null,
      'Lina',
    ).join(' ')
    expect(lines).toContain('rötlich')
    expect(lines).toContain('abgeklärt')
  })

  it('bewertet nicht und gibt keine Empfehlungen', () => {
    const lines = buildWeeklyReview(bundle(), null, 'Lina').join(' ').toLowerCase()
    for (const word of ['solltet', 'zu wenig', 'zu viel', 'empfehlen', 'problem']) {
      expect(lines).not.toContain(word)
    }
  })

  it('laesst Abschnitte ohne Daten weg', () => {
    const lines = buildWeeklyReview(
      bundle({
        feeding: { ...bundle().feeding, bottleMl: 0, solidsCount: 0 },
        diapers: { ...bundle().diapers, total: 0 },
      }),
      null,
      'Lina',
    ).join(' ')
    expect(lines).not.toContain('Flasche')
    expect(lines).not.toContain('Beikost')
    expect(lines).not.toContain('Windeln')
  })
})
