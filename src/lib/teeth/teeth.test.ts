import { describe, expect, it } from 'vitest'
import {
  ZAEHNE,
  ZAHN_ANZAHL,
  ausfallText,
  durchbruchText,
  reihe,
  zahnByKey,
} from './schema'
import { uebersicht, zustaende, type ZahnEintrag } from './overview'
import { CHART_BREITE, CHART_HOEHE, zahnPositionen } from './layout'

const GEBURT = new Date('2026-10-28T03:30:00.000Z')

describe('Milchgebiss', () => {
  it('hat zwanzig Zähne, je Quadrant fünf', () => {
    expect(ZAHN_ANZAHL).toBe(20)
    expect(ZAEHNE).toHaveLength(20)
    for (const q of ['5', '6', '7', '8']) {
      expect(ZAEHNE.filter((z) => z.key.startsWith(q))).toHaveLength(5)
    }
  })

  it('nummeriert nach FDI', () => {
    expect(zahnByKey('51')).toMatchObject({ kiefer: 'oben', seite: 'rechts', position: 1 })
    expect(zahnByKey('61')).toMatchObject({ kiefer: 'oben', seite: 'links', position: 1 })
    expect(zahnByKey('71')).toMatchObject({ kiefer: 'unten', seite: 'links', position: 1 })
    expect(zahnByKey('81')).toMatchObject({ kiefer: 'unten', seite: 'rechts', position: 1 })
    expect(zahnByKey('99')).toBeNull()
  })

  it('hat eindeutige Schlüssel', () => {
    const keys = ZAEHNE.map((z) => z.key)
    expect(new Set(keys).size).toBe(20)
  })

  it('reiht jede Reihe von rechts außen nach links außen', () => {
    expect(reihe('oben').map((z) => z.key)).toEqual([
      '55', '54', '53', '52', '51', '61', '62', '63', '64', '65',
    ])
    expect(reihe('unten').map((z) => z.key)).toEqual([
      '85', '84', '83', '82', '81', '71', '72', '73', '74', '75',
    ])
  })

  it('lässt die unteren Schneidezähne zuerst kommen', () => {
    expect(zahnByKey('81')!.durchbruchVonMonaten).toBeLessThan(
      zahnByKey('51')!.durchbruchVonMonaten,
    )
  })

  it('hält Durchbruch vor Ausfall bei jedem Zahn', () => {
    for (const zahn of ZAEHNE) {
      expect(zahn.durchbruchVonMonaten, zahn.key).toBeLessThan(zahn.durchbruchBisMonaten)
      expect(zahn.ausfallVonJahren, zahn.key).toBeLessThan(zahn.ausfallBisJahren)
      expect(zahn.durchbruchBisMonaten, zahn.key).toBeLessThan(zahn.ausfallVonJahren * 12)
    }
  })

  it('formuliert die Spannen ohne Wertung', () => {
    const text = `${durchbruchText(zahnByKey('81')!)} ${ausfallText(zahnByKey('81')!)}`
    expect(text).toMatch(/üblich/)
    expect(text).not.toMatch(/sollte|verspätet|zu spät|normal/)
  })
})

describe('zustaende', () => {
  const eintraege: ZahnEintrag[] = [
    { toothKey: '81', eruptedOn: new Date('2027-05-10T00:00:00Z'), lostOn: null },
    { toothKey: '71', eruptedOn: new Date('2027-05-28T00:00:00Z'), lostOn: null, note: 'unruhige Nacht' },
  ]

  it('markiert eingetragene Zähne als da', () => {
    const liste = zustaende(eintraege, GEBURT, new Date('2027-06-01T00:00:00Z'))
    expect(liste.find((z) => z.zahn.key === '81')!.status).toBe('da')
    expect(liste.find((z) => z.zahn.key === '71')!.note).toBe('unruhige Nacht')
  })

  it('rechnet den Lebensmonat beim Durchbruch aus', () => {
    const liste = zustaende(eintraege, GEBURT, new Date('2027-06-01T00:00:00Z'))
    expect(liste.find((z) => z.zahn.key === '81')!.lebensmonat).toBe(6)
  })

  it('unterscheidet erwartet und offen nach dem Alter', () => {
    const liste = zustaende([], GEBURT, new Date('2027-06-01T00:00:00Z')) // gut 7 Monate
    // Unterer Schneidezahn ab Monat 6 – erwartet.
    expect(liste.find((z) => z.zahn.key === '81')!.status).toBe('erwartet')
    // Zweiter Backenzahn erst ab Monat 23 – noch gar kein Thema.
    expect(liste.find((z) => z.zahn.key === '75')!.status).toBe('offen')
  })

  it('lässt ohne Geburtsdatum alles offen statt zu raten', () => {
    const liste = zustaende([], null, new Date('2030-01-01T00:00:00Z'))
    expect(liste.every((z) => z.status === 'offen')).toBe(true)
  })

  it('markiert ausgefallene Zähne, auch wenn ein Durchbruch eingetragen ist', () => {
    const liste = zustaende(
      [{ toothKey: '81', eruptedOn: new Date('2027-05-10'), lostOn: new Date('2033-02-01') }],
      GEBURT,
      new Date('2033-06-01T00:00:00Z'),
    )
    expect(liste.find((z) => z.zahn.key === '81')!.status).toBe('ausgefallen')
  })
})

describe('uebersicht', () => {
  it('zählt und nennt den ersten Zahn mit Datum und Lebensmonat', () => {
    const liste = zustaende(
      [
        { toothKey: '71', eruptedOn: new Date('2027-05-28T00:00:00Z'), lostOn: null },
        { toothKey: '81', eruptedOn: new Date('2027-05-10T00:00:00Z'), lostOn: null },
      ],
      GEBURT,
      new Date('2027-06-01T00:00:00Z'),
    )
    const u = uebersicht(liste)
    expect(u.anzahlDa).toBe(2)
    expect(u.anzahlGesamt).toBe(20)
    expect(u.erster!.zahn.key).toBe('81')
    expect(u.erster!.lebensmonat).toBe(6)
    expect(u.letzter!.zahn.key).toBe('71')
  })

  it('meldet bei genau einem Zahn keinen "letzten" – das wäre derselbe', () => {
    const liste = zustaende(
      [{ toothKey: '81', eruptedOn: new Date('2027-05-10T00:00:00Z'), lostOn: null }],
      GEBURT,
    )
    const u = uebersicht(liste)
    expect(u.erster!.zahn.key).toBe('81')
    expect(u.letzter).toBeNull()
  })

  it('zählt ausgefallene Zähne getrennt', () => {
    const liste = zustaende(
      [{ toothKey: '81', eruptedOn: new Date('2027-05-10'), lostOn: new Date('2033-02-01') }],
      GEBURT,
      new Date('2033-06-01T00:00:00Z'),
    )
    const u = uebersicht(liste)
    expect(u.anzahlDa).toBe(0)
    expect(u.anzahlAusgefallen).toBe(1)
  })

  it('kommt mit einem leeren Gebiss klar', () => {
    const u = uebersicht(zustaende([], GEBURT))
    expect(u.anzahlDa).toBe(0)
    expect(u.erster).toBeNull()
    expect(u.letzter).toBeNull()
  })
})

describe('zahnPositionen', () => {
  it('legt zehn Zähne je Kiefer in Reihenfolge auf den Bogen', () => {
    const oben = zahnPositionen('oben')
    expect(oben).toHaveLength(10)
    expect(oben.map((p) => p.zahn.key)).toEqual(reihe('oben').map((z) => z.key))
    // Von links nach rechts durchlaufend – keine Sprünge in der Zeichnung.
    for (let i = 1; i < oben.length; i += 1) {
      expect(oben[i]!.x).toBeGreaterThan(oben[i - 1]!.x)
    }
  })

  it('spiegelt den Unterkiefer an der Waagrechten', () => {
    const oben = zahnPositionen('oben')
    const unten = zahnPositionen('unten')
    // Die vorderen Zähne liegen oben am höchsten, unten am tiefsten.
    const obenVorne = oben.find((p) => p.zahn.position === 1)!
    const untenVorne = unten.find((p) => p.zahn.position === 1)!
    expect(obenVorne.y).toBeLessThan(untenVorne.y)
    expect(Math.abs(obenVorne.x - untenVorne.x)).toBeLessThan(0.001)
  })

  it('bleibt innerhalb der Zeichenfläche', () => {
    for (const position of [...zahnPositionen('oben'), ...zahnPositionen('unten')]) {
      expect(position.x).toBeGreaterThan(0)
      expect(position.x).toBeLessThan(CHART_BREITE)
      expect(position.y).toBeGreaterThan(0)
      expect(position.y).toBeLessThan(CHART_HOEHE)
    }
  })

  it('gibt Backenzähnen mehr Breite als Schneidezähnen', () => {
    const oben = zahnPositionen('oben')
    const schneide = oben.find((p) => p.zahn.position === 1)!
    const backen = oben.find((p) => p.zahn.position === 5)!
    expect(backen.breite).toBeGreaterThan(schneide.breite)
  })
})
