import { describe, expect, it } from 'vitest'
import {
  NACHTRAG_TYPEN,
  haeufigsterWert,
  mengenVorschlag,
  relativeZeit,
  uhrzeitEingabe,
  zeitBestaetigung,
  zeitEingabe,
} from './nachtragen'

const TZ = 'Europe/Vienna'
/** 23.08.2026, 20:00 Wiener Zeit (Sommerzeit, UTC+2). */
const ABEND = new Date('2026-08-23T18:00:00Z')
/** 24.08.2026, 03:10 Wiener Zeit – die typische Nachtsituation. */
const NACHTS = new Date('2026-08-24T01:10:00Z')

describe('relativeZeit', () => {
  it('versteht Stunden und Minuten in Ziffern', () => {
    expect(relativeZeit('vor 2 Stunden', ABEND)?.toISOString()).toBe('2026-08-23T16:00:00.000Z')
    expect(relativeZeit('vor 20 min', ABEND)?.toISOString()).toBe('2026-08-23T17:40:00.000Z')
    expect(relativeZeit('vor 45 Minuten', ABEND)?.toISOString()).toBe('2026-08-23T17:15:00.000Z')
  })

  it('versteht ausgeschriebene Zahlen', () => {
    expect(relativeZeit('vor drei Stunden', ABEND)?.toISOString()).toBe('2026-08-23T15:00:00.000Z')
    expect(relativeZeit('vor einer Stunde', ABEND)?.toISOString()).toBe('2026-08-23T17:00:00.000Z')
  })

  it('versteht die halbe Stunde', () => {
    expect(relativeZeit('vor einer halben Stunde', ABEND)?.toISOString()).toBe(
      '2026-08-23T17:30:00.000Z',
    )
    expect(relativeZeit('vor halber Stunde', ABEND)?.toISOString()).toBe('2026-08-23T17:30:00.000Z')
  })

  it('nimmt Kommazahlen', () => {
    expect(relativeZeit('vor 1,5 Stunden', ABEND)?.toISOString()).toBe('2026-08-23T16:30:00.000Z')
  })

  it('lehnt ab, was nicht so gemeint war', () => {
    expect(relativeZeit('14:30', ABEND)).toBe(null)
    expect(relativeZeit('vor', ABEND)).toBe(null)
    expect(relativeZeit('vor gestern', ABEND)).toBe(null)
    expect(relativeZeit('', ABEND)).toBe(null)
  })

  it('nimmt keine Angabe über zwei Tage – da ist ein Tippfehler wahrscheinlicher', () => {
    expect(relativeZeit('vor 50 Stunden', ABEND)).toBe(null)
    expect(relativeZeit('vor 0 Minuten', ABEND)).toBe(null)
  })
})

describe('uhrzeitEingabe', () => {
  it('nimmt die digitale Schreibweise', () => {
    expect(uhrzeitEingabe('02:30', NACHTS, TZ)?.toISOString()).toBe('2026-08-24T00:30:00.000Z')
    expect(uhrzeitEingabe('2.30', NACHTS, TZ)?.toISOString()).toBe('2026-08-24T00:30:00.000Z')
  })

  it('versteht „halb drei" als 2:30', () => {
    expect(uhrzeitEingabe('halb drei', NACHTS, TZ)?.toISOString()).toBe('2026-08-24T00:30:00.000Z')
  })

  it('versteht „viertel vor acht" und „dreiviertel acht"', () => {
    // 19:45 Wiener Zeit am Vorabend.
    expect(uhrzeitEingabe('viertel vor acht', ABEND, TZ)?.toISOString()).toBe(
      '2026-08-23T17:45:00.000Z',
    )
    expect(uhrzeitEingabe('dreiviertel acht', ABEND, TZ)?.toISOString()).toBe(
      '2026-08-23T17:45:00.000Z',
    )
  })

  it('nimmt die volle Stunde', () => {
    expect(uhrzeitEingabe('14 Uhr', ABEND, TZ)?.toISOString()).toBe('2026-08-23T12:00:00.000Z')
    expect(uhrzeitEingabe('18', ABEND, TZ)?.toISOString()).toBe('2026-08-23T16:00:00.000Z')
  })

  it('landet immer in der Vergangenheit', () => {
    for (const eingabe of ['02:30', 'halb drei', '23:50', '14 Uhr']) {
      const zeit = uhrzeitEingabe(eingabe, NACHTS, TZ)
      expect(zeit).not.toBe(null)
      expect(zeit!.getTime()).toBeLessThanOrEqual(NACHTS.getTime())
    }
  })

  it('deutet eine kleine Zahl am Abend als Nachmittag', () => {
    // Um 20 Uhr meint "halb drei" den Nachmittag, nicht die vergangene Nacht.
    expect(uhrzeitEingabe('halb drei', ABEND, TZ)?.toISOString()).toBe('2026-08-23T12:30:00.000Z')
  })

  it('lehnt Unsinn ab', () => {
    expect(uhrzeitEingabe('gestern', ABEND, TZ)).toBe(null)
    expect(uhrzeitEingabe('25:99', ABEND, TZ)).toBe(null)
    expect(uhrzeitEingabe('', ABEND, TZ)).toBe(null)
  })
})

describe('zeitEingabe', () => {
  it('nimmt beide Schreibweisen in derselben Zeile', () => {
    expect(zeitEingabe('vor 2 Stunden', ABEND, TZ)?.toISOString()).toBe('2026-08-23T16:00:00.000Z')
    expect(zeitEingabe('halb drei', NACHTS, TZ)?.toISOString()).toBe('2026-08-24T00:30:00.000Z')
    expect(zeitEingabe('quatsch', ABEND, TZ)).toBe(null)
  })
})

describe('zeitBestaetigung', () => {
  it('nennt die Uhrzeit und den Abstand', () => {
    const zeit = new Date('2026-08-23T16:00:00Z')
    expect(zeitBestaetigung(zeit, ABEND, TZ)).toBe('18:00 · vor 2 Std')
  })

  it('lässt den Abstand bei „gerade eben" weg', () => {
    expect(zeitBestaetigung(ABEND, ABEND, TZ)).toBe('20:00')
  })

  it('nennt Minuten unter einer Stunde', () => {
    const zeit = new Date('2026-08-23T17:35:00Z')
    expect(zeitBestaetigung(zeit, ABEND, TZ)).toBe('19:35 · vor 25 Min')
  })
})

describe('Vorschläge', () => {
  it('schlägt nur vor, was dreimal gleich war', () => {
    expect(mengenVorschlag([90, 90, 90, 120])).toBe(90)
    expect(mengenVorschlag([90, 120, 90])).toBe(null)
    expect(mengenVorschlag([90, 90])).toBe(null)
  })

  it('überspringt Einträge ohne Menge', () => {
    expect(mengenVorschlag([90, null, 90, 90, 90])).toBe(90)
  })

  it('bleibt bei zu wenig Erfahrung still', () => {
    expect(haeufigsterWert([])).toBe(null)
    expect(haeufigsterWert(['links'])).toBe(null)
    expect(haeufigsterWert(['links', 'links', 'links'])).toBe('links')
  })
})

describe('NACHTRAG_TYPEN', () => {
  it('sind die vier Kategorien, die nachts anfallen', () => {
    expect(NACHTRAG_TYPEN).toEqual(['nursing', 'bottle', 'diaper', 'sleep'])
  })
})
