import { describe, expect, it } from 'vitest'
import {
  HALTBARKEIT_MAX_STUNDEN,
  HALTBARKEIT_VORGABE,
  haltbarkeitText,
  haltbarkeitenAus,
} from './storage'
import {
  ablaufAm,
  abgelaufene,
  alsNaechstes,
  gruppen,
  istLagerort,
  nachEntnahme,
  statistik,
  zustand,
  type Portion,
} from './portions'

const T0 = new Date('2027-03-01T08:00:00.000Z')
const h = (stunden: number) => new Date(T0.getTime() + stunden * 3600_000)

let counter = 0
function portion(over: Partial<Portion> = {}): Portion {
  counter += 1
  return {
    id: `p${counter}`,
    abgepumptAm: T0,
    mengeMl: 120,
    lagerort: 'kuehlschrank',
    behaelter: null,
    status: 'vorraetig',
    aufgetautAm: null,
    verbrauchtAm: null,
    notiz: null,
    ...over,
  }
}

describe('Haltbarkeiten', () => {
  it('hält die Vorgaben: 4 Tage Kühlschrank, 6 Monate Gefrierfach, 12 Monate Tiefkühler', () => {
    expect(HALTBARKEIT_VORGABE.kuehlschrank).toBe(96)
    expect(HALTBARKEIT_VORGABE.gefrierfach).toBe(6 * 30 * 24)
    expect(HALTBARKEIT_VORGABE.tiefkuehler).toBe(12 * 30 * 24)
  })

  it('gibt aufgetauter Milch ein eigenes, kurzes Fenster', () => {
    expect(HALTBARKEIT_VORGABE.aufgetaut).toBe(24)
    expect(HALTBARKEIT_VORGABE.aufgetaut).toBeLessThan(HALTBARKEIT_VORGABE.kuehlschrank)
  })

  it('übernimmt eingestellte Werte und ignoriert Unsinn', () => {
    const werte = haltbarkeitenAus({ kuehlschrank: 72, gefrierfach: 0, tiefkuehler: null })
    expect(werte.kuehlschrank).toBe(72)
    expect(werte.gefrierfach).toBe(HALTBARKEIT_VORGABE.gefrierfach)
    expect(werte.tiefkuehler).toBe(HALTBARKEIT_VORGABE.tiefkuehler)
    expect(haltbarkeitenAus({ kuehlschrank: HALTBARKEIT_MAX_STUNDEN + 1 }).kuehlschrank).toBe(96)
    expect(haltbarkeitenAus(null)).toEqual(HALTBARKEIT_VORGABE)
  })

  it('formuliert Stunden, Tage und Monate', () => {
    expect(haltbarkeitText(1)).toBe('1 Stunde')
    expect(haltbarkeitText(24)).toBe('24 Stunden')
    expect(haltbarkeitText(96)).toBe('4 Tage')
    expect(haltbarkeitText(6 * 30 * 24)).toBe('6 Monate')
  })
})

describe('ablaufAm', () => {
  const werte = HALTBARKEIT_VORGABE

  it('rechnet ab dem Abpumpen', () => {
    expect(ablaufAm(portion(), werte).toISOString()).toBe(h(96).toISOString())
    expect(ablaufAm(portion({ lagerort: 'tiefkuehler' }), werte).toISOString()).toBe(
      h(12 * 30 * 24).toISOString(),
    )
  })

  it('rechnet aufgetaute Milch ab dem Auftauen – das alte Datum zählt nicht mehr', () => {
    const p = portion({ lagerort: 'tiefkuehler', aufgetautAm: h(2000) })
    expect(ablaufAm(p, werte).toISOString()).toBe(h(2024).toISOString())
  })

  it('fällt bei unbekanntem Lagerort auf das kürzeste Fenster zurück', () => {
    expect(istLagerort('speisekammer')).toBe(false)
    expect(ablaufAm(portion({ lagerort: 'speisekammer' }), werte).toISOString()).toBe(
      h(96).toISOString(),
    )
  })
})

describe('zustand', () => {
  it('markiert abgelaufen und rechnet die Reststunden', () => {
    expect(zustand(portion(), HALTBARKEIT_VORGABE, h(48)).restStunden).toBe(48)
    expect(zustand(portion(), HALTBARKEIT_VORGABE, h(48)).abgelaufen).toBe(false)
    expect(zustand(portion(), HALTBARKEIT_VORGABE, h(97)).abgelaufen).toBe(true)
  })

  it('nennt bei knapper Haltbarkeit auch die Uhrzeit', () => {
    expect(zustand(portion(), HALTBARKEIT_VORGABE, h(60)).text).toMatch(/\d{2}:\d{2}/)
    expect(zustand(portion({ lagerort: 'tiefkuehler' }), HALTBARKEIT_VORGABE, T0).text).not.toMatch(
      /\d{2}:\d{2}/,
    )
  })
})

describe('gruppen', () => {
  const portionen = [
    portion({ id: 'a', lagerort: 'kuehlschrank', mengeMl: 100 }),
    portion({ id: 'b', lagerort: 'kuehlschrank', mengeMl: 60, abgepumptAm: h(-10) }),
    portion({ id: 'c', lagerort: 'tiefkuehler', mengeMl: 200 }),
    portion({ id: 'd', lagerort: 'kuehlschrank', mengeMl: 90, status: 'verbraucht' }),
  ]

  it('gruppiert nach Lagerort und summiert nur das Haltbare', () => {
    const list = gruppen(portionen, HALTBARKEIT_VORGABE, h(1))
    const kuehl = list.find((g) => g.lagerort === 'kuehlschrank')!
    expect(kuehl.summeMl).toBe(160)
    expect(kuehl.anzahl).toBe(2)
    expect(list.find((g) => g.lagerort === 'tiefkuehler')!.summeMl).toBe(200)
    expect(list.find((g) => g.lagerort === 'gefrierfach')).toBeUndefined()
  })

  it('sortiert innerhalb der Gruppe nach Ablauf – ältestes zuerst', () => {
    const list = gruppen(portionen, HALTBARKEIT_VORGABE, h(1))
    expect(list.find((g) => g.lagerort === 'kuehlschrank')!.portionen.map((z) => z.portion.id)).toEqual([
      'b',
      'a',
    ])
  })

  it('stellt Abgelaufenes ans Ende', () => {
    const list = gruppen(
      [portion({ id: 'alt', abgepumptAm: h(-200) }), portion({ id: 'neu' })],
      HALTBARKEIT_VORGABE,
      h(1),
    )
    expect(list[0]!.portionen.map((z) => z.portion.id)).toEqual(['neu', 'alt'])
    expect(list[0]!.summeMl).toBe(120)
  })
})

describe('alsNaechstes', () => {
  it('nimmt die vorrätige Portion mit dem frühesten Ablauf', () => {
    const next = alsNaechstes(
      [
        portion({ id: 'tief', lagerort: 'tiefkuehler' }),
        portion({ id: 'kuehl', abgepumptAm: h(-20) }),
      ],
      HALTBARKEIT_VORGABE,
      h(1),
    )
    expect(next!.portion.id).toBe('kuehl')
  })

  it('überspringt Abgelaufenes und Verbrauchtes', () => {
    const next = alsNaechstes(
      [
        portion({ id: 'hin', abgepumptAm: h(-200) }),
        portion({ id: 'weg', status: 'verbraucht' }),
        portion({ id: 'gut', lagerort: 'gefrierfach' }),
      ],
      HALTBARKEIT_VORGABE,
      h(1),
    )
    expect(next!.portion.id).toBe('gut')
  })

  it('gibt null zurück, wenn nichts da ist', () => {
    expect(alsNaechstes([], HALTBARKEIT_VORGABE)).toBeNull()
  })
})

describe('abgelaufene', () => {
  it('sammelt nur vorrätige, abgelaufene Portionen', () => {
    const list = abgelaufene(
      [
        portion({ id: 'hin', abgepumptAm: h(-200) }),
        portion({ id: 'gut' }),
        portion({ id: 'schonweg', abgepumptAm: h(-200), status: 'verworfen' }),
      ],
      HALTBARKEIT_VORGABE,
      h(1),
    )
    expect(list.map((z) => z.portion.id)).toEqual(['hin'])
  })
})

describe('nachEntnahme', () => {
  it('lässt den Rest stehen', () => {
    expect(nachEntnahme(portion({ mengeMl: 120 }), 40)).toEqual({ restMl: 80, status: 'vorraetig' })
  })

  it('setzt auf verbraucht, wenn nichts übrig bleibt', () => {
    expect(nachEntnahme(portion({ mengeMl: 120 }), 120)).toEqual({ restMl: 0, status: 'verbraucht' })
    expect(nachEntnahme(portion({ mengeMl: 120 }), 500)).toEqual({ restMl: 0, status: 'verbraucht' })
  })

  it('ignoriert negative Mengen', () => {
    expect(nachEntnahme(portion({ mengeMl: 120 }), -10).restMl).toBe(120)
  })
})

describe('statistik', () => {
  it('zählt Vorrat, Verbrauch und Verwurf der letzten 30 Tage', () => {
    const jetzt = h(24)
    const s = statistik(
      [
        portion({ mengeMl: 100 }),
        portion({ mengeMl: 200, lagerort: 'tiefkuehler' }),
        portion({ mengeMl: 150, status: 'verbraucht' }),
        portion({ mengeMl: 50, status: 'verworfen' }),
        // Älter als 30 Tage – zählt nicht mehr mit.
        portion({ mengeMl: 999, status: 'verworfen', abgepumptAm: h(-24 * 40) }),
      ],
      HALTBARKEIT_VORGABE,
      jetzt,
    )
    expect(s.vorratMl).toBe(300)
    expect(s.vorratPortionen).toBe(2)
    expect(s.verbrauchtMl30Tage).toBe(150)
    expect(s.verworfenMl30Tage).toBe(50)
    expect(s.abgepumptMl30Tage).toBe(500)
    expect(s.schnittMl).toBe(125)
  })

  it('bleibt ohne Daten still, statt durch null zu teilen', () => {
    const s = statistik([], HALTBARKEIT_VORGABE)
    expect(s.schnittMl).toBeNull()
    expect(s.vorratMl).toBe(0)
  })
})
