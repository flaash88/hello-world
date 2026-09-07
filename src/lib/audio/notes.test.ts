import { describe, expect, it } from 'vitest'
import {
  MAX_DAUER_SEK,
  WARNUNG_AB_BYTES,
  ZIEL_BITRATE_KBPS,
  dauerText,
  filtere,
  groesseText,
  istGross,
  normalisiereTags,
  titelVorschlag,
} from './notes'

describe('Grenzen', () => {
  it('deckelt Aufnahmen bei drei Minuten', () => {
    expect(MAX_DAUER_SEK).toBe(180)
  })

  it('warnt ab fünf Megabyte', () => {
    expect(WARNUNG_AB_BYTES).toBe(5 * 1024 * 1024)
    expect(istGross(4 * 1024 * 1024)).toBe(false)
    expect(istGross(6 * 1024 * 1024)).toBe(true)
  })

  it('kodiert mit 64 kbit/s – drei Minuten bleiben unter zwei Megabyte', () => {
    expect(ZIEL_BITRATE_KBPS).toBe(64)
    const bytes = (ZIEL_BITRATE_KBPS * 1000 * MAX_DAUER_SEK) / 8
    expect(bytes).toBeLessThan(2 * 1024 * 1024)
  })
})

describe('normalisiereTags', () => {
  it('nimmt bekannte Tags an', () => {
    expect(normalisiereTags(['lachen', 'singen'])).toEqual(['lachen', 'singen'])
  })

  it('wirft Unbekanntes und Doppeltes weg', () => {
    expect(normalisiereTags(['lachen', 'lachen', 'quatsch', 42, null])).toEqual(['lachen'])
  })

  it('ist gegen Groß- und Kleinschreibung sowie Leerzeichen unempfindlich', () => {
    expect(normalisiereTags([' Lachen ', 'ERSTES-WORT'])).toEqual(['lachen', 'erstes-wort'])
  })

  it('kommt mit allem klar, was aus der Datenbank kommen könnte', () => {
    expect(normalisiereTags(null)).toEqual([])
    expect(normalisiereTags('lachen')).toEqual([])
    expect(normalisiereTags({})).toEqual([])
  })
})

describe('dauerText', () => {
  it('formatiert Minuten und Sekunden', () => {
    expect(dauerText(0)).toBe('0:00')
    expect(dauerText(64)).toBe('1:04')
    expect(dauerText(180)).toBe('3:00')
  })

  it('bleibt bei fehlender Dauer still', () => {
    expect(dauerText(null)).toBe('–:––')
    expect(dauerText(Number.NaN)).toBe('–:––')
  })
})

describe('groesseText', () => {
  it('wechselt die Einheit', () => {
    expect(groesseText(512)).toBe('512 B')
    expect(groesseText(2048)).toBe('2 kB')
    expect(groesseText(1.5 * 1024 * 1024)).toBe('1,5 MB')
  })
})

describe('titelVorschlag', () => {
  it('nennt Tag, Monat und Uhrzeit in Wiener Zeit', () => {
    const titel = titelVorschlag(new Date('2027-06-14T18:05:00.000Z'))
    expect(titel).toMatch(/^Aufnahme 14\. Juni/)
    // 18:05 UTC sind im Sommer 20:05 in Wien.
    expect(titel).toMatch(/20:05/)
  })
})

describe('filtere', () => {
  const notizen = [
    { title: 'Erstes Lachen', tags: ['lachen'] },
    { title: 'Brabbeln beim Wickeln', tags: ['brabbeln', 'alltag'] },
    { title: 'Gute-Nacht-Lied', tags: ['singen'] },
  ]

  it('filtert nach Tag', () => {
    expect(filtere(notizen, { tag: 'lachen' }).map((n) => n.title)).toEqual(['Erstes Lachen'])
  })

  it('filtert nach Text, ohne auf Groß- und Kleinschreibung zu achten', () => {
    expect(filtere(notizen, { suche: 'brabbeln' }).map((n) => n.title)).toEqual([
      'Brabbeln beim Wickeln',
    ])
  })

  it('verbindet Tag und Text mit und', () => {
    expect(filtere(notizen, { tag: 'alltag', suche: 'lachen' })).toEqual([])
    expect(filtere(notizen, { tag: 'alltag', suche: 'wickeln' })).toHaveLength(1)
  })

  it('gibt ohne Filter alles zurück', () => {
    expect(filtere(notizen, {})).toHaveLength(3)
  })
})
