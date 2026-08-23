import { describe, expect, it } from 'vitest'
import {
  countByType,
  dailySeries,
  diaperStats,
  durationOf,
  feedingStats,
  overlapMinutes,
  sleepHeatmap,
  sleepStats,
  type StatEvent,
} from './aggregate'
import { addDays, startOfLocalDay } from '@/lib/time'

const TZ = 'Europe/Vienna'
const NOW = new Date('2026-11-15T18:00:00Z')
const DAY_START = startOfLocalDay(NOW, TZ)
const DAY_END = addDays(DAY_START, 1, TZ)

let counter = 0
function event(
  type: string,
  startIso: string,
  endIso: string | null = null,
  payload: unknown = {},
  running = false,
): StatEvent {
  const startedAt = new Date(startIso)
  const endedAt = endIso ? new Date(endIso) : null
  return {
    id: `e${counter++}`,
    type,
    startedAt,
    endedAt,
    durationSec: endedAt ? Math.round((endedAt.getTime() - startedAt.getTime()) / 1000) : null,
    payload,
    running,
  }
}

describe('durationOf', () => {
  it('nutzt die gespeicherte Dauer', () => {
    expect(durationOf(event('sleep', '2026-11-15T08:00:00Z', '2026-11-15T09:00:00Z'))).toBe(3600)
  })

  it('rechnet laufende Timer bis jetzt', () => {
    expect(durationOf(event('sleep', '2026-11-15T17:00:00Z', null, {}, true), NOW)).toBe(3600)
  })

  it('liefert null-Dauer fuer Punkt-Events', () => {
    expect(durationOf(event('diaper', '2026-11-15T08:00:00Z'), NOW)).toBe(0)
  })
})

describe('overlapMinutes', () => {
  it('schneidet am Fensterrand ab', () => {
    // 22:00–02:00 Ortszeit, gezaehlt wird nur bis Mitternacht.
    const nightSleep = event('sleep', '2026-11-15T21:00:00Z', '2026-11-16T01:00:00Z')
    expect(overlapMinutes(nightSleep, DAY_START, DAY_END, NOW)).toBeCloseTo(120, 0)
  })

  it('liefert 0 fuer Events ausserhalb des Fensters', () => {
    expect(overlapMinutes(event('sleep', '2026-11-10T08:00:00Z', '2026-11-10T09:00:00Z'), DAY_START, DAY_END, NOW)).toBe(0)
  })
})

describe('sleepStats', () => {
  const events = [
    event('sleep', '2026-11-15T07:00:00Z', '2026-11-15T08:30:00Z', { kind: 'nap', fallAsleepSec: 600 }),
    event('sleep', '2026-11-15T11:00:00Z', '2026-11-15T12:00:00Z', { kind: 'nap', fallAsleepSec: 900 }),
    event('sleep', '2026-11-14T20:00:00Z', '2026-11-15T05:00:00Z', { kind: 'night', wakeCount: 2 }),
  ]

  it('summiert nur den Anteil im Zeitraum', () => {
    const stats = sleepStats(events, DAY_START, DAY_END, NOW)
    // Nacht 21:00–06:00 Ortszeit: 6 Stunden fallen auf den 15.
    expect(stats.totalMin).toBe(360 + 90 + 60)
    expect(stats.nightMin).toBe(360)
  })

  it('findet den laengsten Block', () => {
    expect(sleepStats(events, DAY_START, DAY_END, NOW).longestBlockMin).toBe(540)
  })

  it('zaehlt Nickerchen und Nachtwachen', () => {
    const stats = sleepStats(events, DAY_START, DAY_END, NOW)
    expect(stats.naps).toBe(2)
    expect(stats.blocks).toBe(2)
    expect(stats.wakeCount).toBe(0) // Die Nacht begann am Vortag.
  })

  it('mittelt die Einschlafdauer', () => {
    expect(sleepStats(events, DAY_START, DAY_END, NOW).avgFallAsleepMin).toBe(13)
  })

  it('bildet den Median der Wachfenster', () => {
    const stats = sleepStats(events, DAY_START, DAY_END, NOW)
    // 06:00->08:00 = 120 Min, 09:30->12:00 = 150 Min -> Median 135
    expect(stats.medianWakeWindowMin).toBe(135)
  })

  it('kommt mit leerer Eingabe zurecht', () => {
    const stats = sleepStats([], DAY_START, DAY_END, NOW)
    expect(stats).toMatchObject({ totalMin: 0, blocks: 0, longestBlockMin: 0 })
    expect(stats.avgFallAsleepMin).toBeNull()
    expect(stats.medianWakeWindowMin).toBeNull()
  })
})

describe('feedingStats', () => {
  const events = [
    event('nursing', '2026-11-15T06:00:00Z', '2026-11-15T06:20:00Z', { side: 'left' }),
    event('nursing', '2026-11-15T09:00:00Z', '2026-11-15T09:15:00Z', { side: 'right' }),
    event('bottle', '2026-11-15T12:00:00Z', '2026-11-15T12:10:00Z', { amountMl: 120 }),
    event('bottle', '2026-11-15T15:00:00Z', '2026-11-15T15:10:00Z', { amountMl: 150 }),
    event('solids', '2026-11-15T16:00:00Z', null, { foods: ['Karotte'] }),
    event('pumping', '2026-11-15T13:00:00Z', '2026-11-15T13:20:00Z', { leftMl: 60, rightMl: 70 }),
  ]

  it('zaehlt und summiert je Art', () => {
    const stats = feedingStats(events, DAY_START, DAY_END, TZ, NOW)
    expect(stats.nursingCount).toBe(2)
    expect(stats.nursingMin).toBe(35)
    expect(stats.bottleCount).toBe(2)
    expect(stats.bottleMl).toBe(270)
    expect(stats.solidsCount).toBe(1)
    expect(stats.mealCount).toBe(5)
  })

  it('summiert beim Abpumpen auch seitengetrennte Mengen', () => {
    expect(feedingStats(events, DAY_START, DAY_END, TZ, NOW).pumpingMl).toBe(130)
  })

  it('bildet den Median der Mahlzeitenabstaende', () => {
    // Abstaende: 180, 180, 180, 60 -> Median 180
    expect(feedingStats(events, DAY_START, DAY_END, TZ, NOW).medianIntervalMin).toBe(180)
  })

  it('verteilt die Mahlzeiten ueber den Tag', () => {
    const stats = feedingStats(events, DAY_START, DAY_END, TZ, NOW)
    expect(sum(stats.byDaypart.map((part) => part.count))).toBe(5)
    expect(stats.byDaypart).toHaveLength(4)
  })

  function sum(values: number[]): number {
    return values.reduce((a, b) => a + b, 0)
  }
})

describe('diaperStats', () => {
  const events = [
    event('diaper', '2026-11-15T06:00:00Z', null, { kind: 'wet' }),
    event('diaper', '2026-11-15T09:00:00Z', null, { kind: 'dirty', color: 'mustard' }),
    event('diaper', '2026-11-15T12:00:00Z', null, { kind: 'both' }),
    event('diaper', '2026-11-15T15:00:00Z', null, { kind: 'dirty', color: 'red' }),
  ]

  it('zaehlt nach Art', () => {
    const stats = diaperStats(events, DAY_START, DAY_END)
    expect(stats).toMatchObject({ total: 4, wet: 1, dirty: 2, both: 1 })
  })

  it('hebt auffaellige Farben hervor', () => {
    expect(diaperStats(events, DAY_START, DAY_END).notable).toEqual([{ color: 'red', count: 1 }])
  })

  it('rechnet den Schnitt pro Tag', () => {
    const weekEnd = addDays(DAY_START, 7, TZ)
    expect(diaperStats(events, DAY_START, weekEnd).perDay).toBeCloseTo(0.6, 1)
  })
})

describe('dailySeries', () => {
  it('liefert eine Zeile je Tag', () => {
    const from = addDays(DAY_START, -6, TZ)
    const series = dailySeries([], from, DAY_END, TZ, NOW)
    expect(series).toHaveLength(7)
    expect(series[0]!.dayKey < series[6]!.dayKey).toBe(true)
  })

  it('verteilt einen Nachtschlaf auf beide Tage', () => {
    const nightSleep = event('sleep', '2026-11-14T20:00:00Z', '2026-11-15T05:00:00Z', { kind: 'night' })
    const from = addDays(DAY_START, -1, TZ)
    const series = dailySeries([nightSleep], from, DAY_END, TZ, NOW)
    expect(series[0]!.sleepMin).toBe(180) // 21:00–24:00
    expect(series[1]!.sleepMin).toBe(360) // 00:00–06:00
  })

  it('zaehlt Mahlzeiten und Windeln je Tag', () => {
    const series = dailySeries(
      [
        event('bottle', '2026-11-15T09:00:00Z', '2026-11-15T09:10:00Z', { amountMl: 100 }),
        event('diaper', '2026-11-15T10:00:00Z'),
      ],
      DAY_START,
      DAY_END,
      TZ,
      NOW,
    )
    expect(series[0]).toMatchObject({ feeds: 1, bottleMl: 100, diapers: 1 })
  })
})

describe('sleepHeatmap', () => {
  it('verteilt Schlaf auf Stundenzellen', () => {
    const cells = sleepHeatmap(
      [event('sleep', '2026-11-15T07:30:00Z', '2026-11-15T09:00:00Z')],
      DAY_START,
      DAY_END,
      TZ,
      NOW,
    )
    // 08:30–10:00 Ortszeit: 30 Minuten in Stunde 8, 60 in Stunde 9.
    expect(cells.find((cell) => cell.hour === 8)!.minutes).toBe(30)
    expect(cells.find((cell) => cell.hour === 9)!.minutes).toBe(60)
    expect(cells.every((cell) => cell.minutes > 0)).toBe(true)
  })

  it('laesst leere Stunden weg', () => {
    const cells = sleepHeatmap([], DAY_START, DAY_END, TZ, NOW)
    expect(cells).toHaveLength(0)
  })

  it('haelt sich an die 24 Stunden eines normalen Tages', () => {
    const cells = sleepHeatmap(
      [event('sleep', '2026-11-14T23:00:00Z', '2026-11-15T23:00:00Z')],
      DAY_START,
      DAY_END,
      TZ,
      NOW,
    )
    expect(cells).toHaveLength(24)
    expect(Math.max(...cells.map((cell) => cell.hour))).toBe(23)
  })
})

describe('countByType', () => {
  it('zaehlt je Typ', () => {
    const counts = countByType([
      event('sleep', '2026-11-15T08:00:00Z'),
      event('sleep', '2026-11-15T10:00:00Z'),
      event('diaper', '2026-11-15T11:00:00Z'),
    ])
    expect(counts.get('sleep')).toBe(2)
    expect(counts.get('diaper')).toBe(1)
  })
})
