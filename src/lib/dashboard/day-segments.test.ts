import { describe, expect, it } from 'vitest'
import {
  MINUTES_PER_DAY,
  arcPath,
  minuteAusPunkt,
  minuteLabel,
  polarPoint,
  ringFuerRadius,
  segmentBeiMinute,
  toDaySegments,
  type DaySegment,
  type SegmentSource,
} from './day-segments'
import { addDays, startOfLocalDay } from '@/lib/time'

const TZ = 'Europe/Vienna'
const NOW = new Date('2026-11-15T15:00:00Z')
const DAY_START = startOfLocalDay(NOW, TZ)
const DAY_END = addDays(DAY_START, 1, TZ)

function source(
  id: string,
  startIso: string,
  endIso: string | null,
  type = 'sleep',
  running = false,
): SegmentSource {
  return { id, type, startedAt: new Date(startIso), endedAt: endIso ? new Date(endIso) : null, running }
}

describe('toDaySegments', () => {
  it('rechnet Zeitraeume in Minuten seit lokal Mitternacht um', () => {
    // 09:00–10:30 Ortszeit (Winterzeit, UTC+1)
    const segments = toDaySegments(
      [source('a', '2026-11-15T08:00:00Z', '2026-11-15T09:30:00Z')],
      DAY_START,
      DAY_END,
      TZ,
      NOW,
    )
    expect(segments).toHaveLength(1)
    expect(segments[0]!.fromMin).toBeCloseTo(9 * 60, 1)
    expect(segments[0]!.toMin).toBeCloseTo(10 * 60 + 30, 1)
  })

  it('schneidet einen Block ab, der vor Mitternacht begonnen hat', () => {
    const segments = toDaySegments(
      [source('nacht', '2026-11-14T19:00:00Z', '2026-11-15T05:00:00Z')],
      DAY_START,
      DAY_END,
      TZ,
      NOW,
    )
    expect(segments[0]!.fromMin).toBe(0)
    expect(segments[0]!.toMin).toBeCloseTo(6 * 60, 1)
  })

  it('schneidet einen Block ab, der ueber Mitternacht hinausgeht', () => {
    const segments = toDaySegments(
      [source('abend', '2026-11-15T19:00:00Z', '2026-11-16T05:00:00Z')],
      DAY_START,
      DAY_END,
      TZ,
      NOW,
    )
    expect(segments[0]!.fromMin).toBeCloseTo(20 * 60, 1)
    expect(segments[0]!.toMin).toBe(MINUTES_PER_DAY)
  })

  it('laesst Bloecke ausserhalb des Tages weg', () => {
    const segments = toDaySegments(
      [source('vorgestern', '2026-11-13T08:00:00Z', '2026-11-13T09:00:00Z')],
      DAY_START,
      DAY_END,
      TZ,
      NOW,
    )
    expect(segments).toHaveLength(0)
  })

  it('zeichnet Punkt-Events mit Mindestbreite', () => {
    const segments = toDaySegments(
      [source('windel', '2026-11-15T08:00:00Z', '2026-11-15T08:00:00Z', 'diaper')],
      DAY_START,
      DAY_END,
      TZ,
      NOW,
    )
    expect(segments[0]!.isPoint).toBe(true)
    expect(segments[0]!.toMin - segments[0]!.fromMin).toBeGreaterThan(0)
  })

  it('zieht laufende Timer bis zur aktuellen Zeit', () => {
    const segments = toDaySegments(
      [source('laeuft', '2026-11-15T14:00:00Z', null, 'sleep', true)],
      DAY_START,
      DAY_END,
      TZ,
      NOW,
    )
    expect(segments[0]!.toMin).toBeCloseTo(16 * 60, 1)
    expect(segments[0]!.running).toBe(true)
  })

  it('sortiert nach Startzeit', () => {
    const segments = toDaySegments(
      [
        source('spaet', '2026-11-15T14:00:00Z', '2026-11-15T15:00:00Z'),
        source('frueh', '2026-11-15T06:00:00Z', '2026-11-15T07:00:00Z'),
      ],
      DAY_START,
      DAY_END,
      TZ,
      NOW,
    )
    expect(segments.map((s) => s.id)).toEqual(['frueh', 'spaet'])
  })
})

describe('polarPoint', () => {
  it('legt Mitternacht nach oben und Mittag nach unten', () => {
    const midnight = polarPoint(0, 100, 100)
    expect(midnight.x).toBeCloseTo(100, 5)
    expect(midnight.y).toBeCloseTo(0, 5)

    const noon = polarPoint(720, 100, 100)
    expect(noon.x).toBeCloseTo(100, 5)
    expect(noon.y).toBeCloseTo(200, 5)
  })

  it('legt 06:00 nach rechts und 18:00 nach links', () => {
    expect(polarPoint(360, 100, 100).x).toBeCloseTo(200, 5)
    expect(polarPoint(1080, 100, 100).x).toBeCloseTo(0, 5)
  })
})

describe('arcPath', () => {
  it('erzeugt einen gueltigen Pfad', () => {
    const path = arcPath(0, 360, 80, 100, 100)
    expect(path).toMatch(/^M /)
    expect(path).toContain('A 100 100')
    expect(path.endsWith('Z')).toBe(true)
  })

  it('setzt das large-arc-Flag bei mehr als zwoelf Stunden', () => {
    expect(arcPath(0, 300, 80, 100, 100)).toContain('0 1 ')
    expect(arcPath(0, 900, 80, 100, 100)).toContain('1 1 ')
  })

  it('zeichnet einen vollen Tag als zwei Boegen', () => {
    const path = arcPath(0, MINUTES_PER_DAY, 80, 100, 100)
    expect(path.match(/M /g)).toHaveLength(2)
  })

  it('gibt Nullbreiten eine Mindestbreite', () => {
    expect(arcPath(100, 100, 80, 100, 100)).toMatch(/^M /)
  })
})

describe('minuteLabel', () => {
  it('formatiert im 24-Stunden-Format', () => {
    expect(minuteLabel(0)).toBe('00:00')
    expect(minuteLabel(875)).toBe('14:35')
    expect(minuteLabel(1439)).toBe('23:59')
    expect(minuteLabel(1440)).toBe('00:00')
  })
})

// --------------------------------------------------- Treffer auf der Scheibe

describe('minuteAusPunkt', () => {
  const C = 170

  it('liest Mitternacht oben ab', () => {
    expect(minuteAusPunkt(C, C - 100, C)).toBeCloseTo(0)
  })

  it('liest Mittag unten ab', () => {
    expect(minuteAusPunkt(C, C + 100, C)).toBeCloseTo(720)
  })

  it('liest 06:00 rechts und 18:00 links ab', () => {
    expect(minuteAusPunkt(C + 100, C, C)).toBeCloseTo(360)
    expect(minuteAusPunkt(C - 100, C, C)).toBeCloseTo(1080)
  })

  it('ist die Umkehrung von polarPoint', () => {
    for (const minute of [0, 137, 500, 719, 1200, 1439]) {
      const punkt = polarPoint(minute, 120, C)
      expect(minuteAusPunkt(punkt.x, punkt.y, C)).toBeCloseTo(minute, 3)
    }
  })
})

describe('ringFuerRadius', () => {
  const RINGE = [
    { inner: 112, outer: 140 },
    { inner: 80, outer: 108 },
  ]

  it('findet den Ring, in dem der Punkt liegt', () => {
    expect(ringFuerRadius(126, RINGE, 0)).toBe(0)
    expect(ringFuerRadius(94, RINGE, 0)).toBe(1)
  })

  it('nimmt einen Tap knapp daneben noch an', () => {
    // Zwischen zwei Ringen liegen vier Einheiten – ein Tap dort soll nicht
    // ins Leere gehen.
    expect(ringFuerRadius(110, RINGE)).toBe(0)
  })

  it('gibt null zurück, wenn der Punkt weit weg liegt', () => {
    expect(ringFuerRadius(10, RINGE)).toBeNull()
    expect(ringFuerRadius(200, RINGE)).toBeNull()
  })
})

describe('segmentBeiMinute', () => {
  const segment = (id: string, fromMin: number, toMin: number): DaySegment => ({
    id,
    type: 'diaper',
    fromMin,
    toMin,
    isPoint: toMin - fromMin <= 6,
    running: false,
    label: id,
  })

  it('trifft ein Segment, das die Minute abdeckt', () => {
    const treffer = segmentBeiMinute([segment('a', 100, 160), segment('b', 400, 460)], 130)
    expect(treffer?.id).toBe('a')
  })

  it('trifft einen Eintrag ohne Dauer auch daneben', () => {
    // Genau das war der Punkt: eine Windel um 20:53 als Bogen von sechs
    // Minuten trifft niemand mit dem Daumen.
    const treffer = segmentBeiMinute([segment('windel', 1253, 1259)], 1245)
    expect(treffer?.id).toBe('windel')
  })

  it('nimmt den näheren von zwei Einträgen', () => {
    const treffer = segmentBeiMinute([segment('a', 600, 606), segment('b', 640, 646)], 635)
    expect(treffer?.id).toBe('b')
  })

  it('wählt nichts aus, wenn weit und breit nichts liegt', () => {
    expect(segmentBeiMinute([segment('a', 100, 160)], 800)).toBeNull()
  })

  it('wählt bei leerem Ring nichts aus', () => {
    expect(segmentBeiMinute([], 500)).toBeNull()
  })
})
