import { describe, expect, it } from 'vitest'
import {
  addDays,
  ageInDays,
  ageInMonths,
  ageInWeeks,
  daysBetween,
  formatAge,
  formatDuration,
  formatRelative,
  formatStopwatch,
  formatTime,
  isWithinWindow,
  localDateKey,
  minutesSinceLocalMidnight,
  parseHhMm,
  startOfLocalDay,
  tzOffsetMinutes,
  zonedParts,
  zonedTimeToUtc,
} from './time'

const TZ = 'Europe/Vienna'

describe('zonedParts', () => {
  it('rechnet UTC in Wiener Winterzeit um (+1)', () => {
    expect(zonedParts(new Date('2026-01-15T12:00:00Z'), TZ)).toMatchObject({
      year: 2026,
      month: 1,
      day: 15,
      hour: 13,
      minute: 0,
    })
  })

  it('rechnet UTC in Wiener Sommerzeit um (+2)', () => {
    expect(zonedParts(new Date('2026-07-15T12:00:00Z'), TZ)).toMatchObject({ hour: 14 })
  })

  it('rollt ueber die Datumsgrenze', () => {
    expect(zonedParts(new Date('2026-07-15T23:30:00Z'), TZ)).toMatchObject({ day: 16, hour: 1 })
  })
})

describe('tzOffsetMinutes', () => {
  it('liefert 60 im Winter und 120 im Sommer', () => {
    expect(tzOffsetMinutes(new Date('2026-01-15T12:00:00Z'), TZ)).toBe(60)
    expect(tzOffsetMinutes(new Date('2026-07-15T12:00:00Z'), TZ)).toBe(120)
  })
})

describe('zonedTimeToUtc', () => {
  it('macht die Umrechnung von zonedParts rueckgaengig', () => {
    const original = new Date('2026-03-15T08:23:00Z')
    const parts = zonedParts(original, TZ)
    expect(zonedTimeToUtc(parts, TZ).toISOString()).toBe(original.toISOString())
  })

  it('trifft auch am Tag der Zeitumstellung', () => {
    // Umstellung auf Sommerzeit 2026: 29. Maerz, 02:00 -> 03:00
    const afterSwitch = zonedTimeToUtc({ year: 2026, month: 3, day: 29, hour: 14 }, TZ)
    expect(afterSwitch.toISOString()).toBe('2026-03-29T12:00:00.000Z')
    const beforeSwitch = zonedTimeToUtc({ year: 2026, month: 3, day: 28, hour: 14 }, TZ)
    expect(beforeSwitch.toISOString()).toBe('2026-03-28T13:00:00.000Z')
  })
})

describe('startOfLocalDay', () => {
  it('liefert Mitternacht Ortszeit als UTC', () => {
    expect(startOfLocalDay(new Date('2026-07-15T23:30:00Z'), TZ).toISOString()).toBe(
      '2026-07-15T22:00:00.000Z',
    )
  })
})

describe('addDays', () => {
  it('bleibt ueber die Zeitumstellung bei derselben Ortszeit', () => {
    const before = zonedTimeToUtc({ year: 2026, month: 3, day: 28, hour: 22 }, TZ)
    const after = addDays(before, 1, TZ)
    expect(zonedParts(after, TZ)).toMatchObject({ day: 29, hour: 22 })
  })
})

describe('localDateKey und daysBetween', () => {
  it('gruppiert nach lokalem Tag, nicht nach UTC-Tag', () => {
    expect(localDateKey(new Date('2026-07-15T23:30:00Z'), TZ)).toBe('2026-07-16')
    expect(localDateKey(new Date('2026-07-15T21:30:00Z'), TZ)).toBe('2026-07-15')
  })

  it('zaehlt Kalendertage in Ortszeit', () => {
    // 01.07. 22:00 UTC ist in Wien bereits der 02.07. – gezaehlt wird der lokale Tag.
    expect(daysBetween(new Date('2026-07-01T22:00:00Z'), new Date('2026-07-05T05:00:00Z'), TZ)).toBe(3)
    expect(daysBetween(new Date('2026-07-01T12:00:00Z'), new Date('2026-07-05T05:00:00Z'), TZ)).toBe(4)
  })
})

describe('minutesSinceLocalMidnight', () => {
  it('liefert Minuten fuer die 24h-Uhr', () => {
    expect(minutesSinceLocalMidnight(new Date('2026-07-15T12:30:00Z'), TZ)).toBeCloseTo(14 * 60 + 30)
  })
})

describe('Altersberechnung', () => {
  const birth = new Date('2026-01-10T08:00:00Z')

  it('zaehlt Tage, Wochen und Monate', () => {
    expect(ageInDays(birth, new Date('2026-01-17T05:00:00Z'), TZ)).toBe(7)
    expect(ageInWeeks(birth, new Date('2026-01-17T05:00:00Z'), TZ)).toBe(1)
    expect(ageInWeeks(birth, new Date('2026-01-16T05:00:00Z'), TZ)).toBe(0)
    expect(ageInMonths(birth, new Date('2026-04-09T08:00:00Z'), TZ)).toBe(2)
    expect(ageInMonths(birth, new Date('2026-04-10T08:00:00Z'), TZ)).toBe(3)
  })

  it('wird nie negativ', () => {
    expect(ageInDays(birth, new Date('2025-12-01T00:00:00Z'), TZ)).toBe(0)
  })

  it('formatiert das Alter in passender Einheit', () => {
    expect(formatAge(birth, new Date('2026-01-11T09:00:00Z'), TZ)).toBe('1 Tag alt')
    expect(formatAge(birth, new Date('2026-01-25T09:00:00Z'), TZ)).toBe('2 Wochen, 1 Tage')
    expect(formatAge(birth, new Date('2026-05-10T09:00:00Z'), TZ)).toBe('4 Monate alt')
    expect(formatAge(birth, new Date('2028-03-10T09:00:00Z'), TZ)).toBe('2 J., 2 Mon.')
  })
})

describe('formatDuration und formatStopwatch', () => {
  it('formatiert Dauern lesbar', () => {
    expect(formatDuration(45)).toBe('45 Sek')
    expect(formatDuration(150)).toBe('2 Min 30 Sek')
    expect(formatDuration(600)).toBe('10 Min')
    expect(formatDuration(5040)).toBe('1 Std 24 Min')
    expect(formatDuration(7200)).toBe('2 Std')
    expect(formatDuration(-5)).toBe('0 Sek')
  })

  it('formatiert die Stoppuhr', () => {
    expect(formatStopwatch(0)).toBe('00:00')
    expect(formatStopwatch(65)).toBe('01:05')
    expect(formatStopwatch(3725)).toBe('01:02:05')
  })
})

describe('formatRelative', () => {
  const now = new Date('2026-07-15T12:00:00Z')
  it('beschreibt Vergangenheit und Zukunft', () => {
    expect(formatRelative(new Date('2026-07-15T11:59:40Z'), now)).toBe('gerade eben')
    expect(formatRelative(new Date('2026-07-15T11:48:00Z'), now)).toBe('vor 12 Min')
    expect(formatRelative(new Date('2026-07-15T09:00:00Z'), now)).toBe('vor 3 Std')
    expect(formatRelative(new Date('2026-07-15T12:30:00Z'), now)).toBe('in 30 Min')
    expect(formatRelative(new Date('2026-07-13T12:00:00Z'), now)).toBe('vor 2 Tg')
  })
})

describe('parseHhMm', () => {
  it('nimmt gueltige Zeiten und weist Unsinn zurueck', () => {
    expect(parseHhMm('20:00')).toBe(1200)
    expect(parseHhMm('6:05')).toBe(365)
    expect(parseHhMm('24:00')).toBeNull()
    expect(parseHhMm('12:60')).toBeNull()
    expect(parseHhMm('abc')).toBeNull()
  })
})

describe('isWithinWindow', () => {
  it('behandelt Fenster ueber Mitternacht (Nachtmodus)', () => {
    const at = (iso: string) => new Date(iso)
    expect(isWithinWindow(at('2026-07-15T20:00:00Z'), '20:00', '06:00', TZ)).toBe(true) // 22:00
    expect(isWithinWindow(at('2026-07-15T01:00:00Z'), '20:00', '06:00', TZ)).toBe(true) // 03:00
    expect(isWithinWindow(at('2026-07-15T10:00:00Z'), '20:00', '06:00', TZ)).toBe(false) // 12:00
  })

  it('behandelt normale Fenster', () => {
    expect(isWithinWindow(new Date('2026-07-15T10:00:00Z'), '08:00', '16:00', TZ)).toBe(true)
    expect(isWithinWindow(new Date('2026-07-15T20:00:00Z'), '08:00', '16:00', TZ)).toBe(false)
  })

  it('liefert false bei ungueltigen Zeiten', () => {
    expect(isWithinWindow(new Date(), 'kaputt', '06:00', TZ)).toBe(false)
  })
})

describe('formatTime', () => {
  it('nutzt das 24-Stunden-Format', () => {
    expect(formatTime(new Date('2026-07-15T18:05:00Z'), TZ)).toBe('20:05')
    expect(formatTime(new Date('2026-07-15T22:05:00Z'), TZ)).toBe('00:05')
  })
})
