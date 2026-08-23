import { describe, expect, it } from 'vitest'
import type { Impfung, KbgFrist, Untersuchung } from './schema'
import {
  REMINDER_OFFSETS_DAYS,
  erinnerungenFor,
  fensterText,
  impfEintraege,
  kbgFristen,
  letzterTag,
  statusFor,
  untersuchungsEintraege,
  verlauf,
  zeitfensterFor,
} from './status'

// Geburt am 28. Oktober 2026, 04:30 Wiener Zeit.
const GEBURT = new Date('2026-10-28T03:30:00.000Z')

const impfung = (over: Partial<Impfung> = {}): Impfung => ({
  key: 'test-1',
  name: 'Testimpfung',
  schutzGegen: ['Test'],
  dosisNr: 1,
  fenster: { vonWochen: 7, bisWochen: 12 },
  mindestabstandZurVordosisWochen: null,
  kostenfrei: true,
  hinweis: 'Hinweis',
  quelle: 'Quelle',
  ...over,
})

const untersuchung = (over: Partial<Untersuchung> = {}): Untersuchung => ({
  nummer: 1,
  bezeichnung: 'Erstuntersuchung',
  fenster: { vonWochen: 0, bisWochen: 1 },
  fensterText: 'in der 1. Lebenswoche',
  durchfuehrendeStelle: 'Krankenhaus',
  separaterTermin: false,
  kbgRelevant: true,
  inhalt: 'Inhalt',
  quelle: 'Quelle',
  ...over,
})

describe('zeitfensterFor', () => {
  it('rechnet Wochen als exakte Sieben-Tage-Schritte', () => {
    const f = zeitfensterFor(GEBURT, { vonWochen: 7, bisWochen: 12 })
    expect(f.from!.toISOString()).toBe('2026-12-16T03:30:00.000Z')
    expect(f.to!.toISOString()).toBe('2027-01-20T03:30:00.000Z')
  })

  it('rechnet Monate kalendarisch', () => {
    const f = zeitfensterFor(GEBURT, { vonMonaten: 2, bisMonaten: 3 })
    expect(f.from!.toISOString().slice(0, 10)).toBe('2026-12-28')
    expect(f.to!.toISOString().slice(0, 10)).toBe('2027-01-28')
  })

  it('vertraegt gemischte Einheiten – Beginn in Wochen, Ende in Monaten', () => {
    const f = zeitfensterFor(GEBURT, { vonWochen: 6, bisMonaten: 3 })
    expect(f.from!.toISOString().slice(0, 10)).toBe('2026-12-09')
    expect(f.to!.toISOString().slice(0, 10)).toBe('2027-01-28')
  })

  it('laesst offene Grenzen offen', () => {
    expect(zeitfensterFor(GEBURT, { bisMonaten: 62 }).from).toBeNull()
    expect(zeitfensterFor(GEBURT, null)).toEqual({ from: null, to: null })
  })

  it('nennt als letzten Tag den Tag vor dem Fensterende', () => {
    const f = zeitfensterFor(GEBURT, { vonWochen: 0, bisWochen: 1 })
    expect(letzterTag(f)!.toISOString().slice(0, 10)).toBe('2026-11-03')
  })
})

describe('statusFor', () => {
  const f = zeitfensterFor(GEBURT, { vonWochen: 7, bisWochen: 12 })

  it('erledigt schlaegt alles andere', () => {
    expect(statusFor(f, new Date('2027-05-01T00:00:00Z'), new Date('2027-06-01T00:00:00Z'))).toBe(
      'erledigt',
    )
  })

  it('vor dem Fenster offen, im Fenster faellig, danach ueberfaellig', () => {
    expect(statusFor(f, null, new Date('2026-11-01T00:00:00Z'))).toBe('offen')
    expect(statusFor(f, null, new Date('2026-12-20T00:00:00Z'))).toBe('faellig')
    expect(statusFor(f, null, new Date('2027-02-01T00:00:00Z'))).toBe('ueberfaellig')
  })

  it('ist am Fensteranfang bereits faellig und am Ende schon vorbei', () => {
    expect(statusFor(f, null, f.from!)).toBe('faellig')
    expect(statusFor(f, null, f.to!)).toBe('ueberfaellig')
  })

  it('meldet ohneFenster, wenn die Quelle keinen Zeitraum nennt', () => {
    expect(statusFor({ from: null, to: null }, null, new Date())).toBe('ohneFenster')
  })
})

describe('erinnerungenFor', () => {
  const f = zeitfensterFor(GEBURT, { vonWochen: 7, bisWochen: 12 })

  it('erinnert 14 und 3 Tage vor Fensterende', () => {
    const r = erinnerungenFor(f, new Date('2026-12-20T00:00:00Z'))
    expect(r.map((x) => x.offsetDays)).toEqual([...REMINDER_OFFSETS_DAYS])
    expect(r[0]!.dueAt.toISOString().slice(0, 10)).toBe('2027-01-06')
    expect(r[1]!.dueAt.toISOString().slice(0, 10)).toBe('2027-01-17')
  })

  it('laesst vergangene Erinnerungen weg', () => {
    expect(erinnerungenFor(f, new Date('2027-01-10T00:00:00Z'))).toHaveLength(1)
    expect(erinnerungenFor(f, new Date('2027-02-01T00:00:00Z'))).toHaveLength(0)
  })

  it('erinnert nicht ohne Fensterende', () => {
    expect(erinnerungenFor({ from: GEBURT, to: null })).toHaveLength(0)
  })
})

describe('fensterText', () => {
  const f = zeitfensterFor(GEBURT, { vonWochen: 7, bisWochen: 12 })

  it('zaehlt die verbleibenden Tage', () => {
    expect(fensterText(f, 'faellig', new Date('2027-01-15T12:00:00Z'))).toMatch(/^noch 4 Tage/)
  })

  it('bleibt bei abgelaufenem Fenster sachlich', () => {
    const text = fensterText(f, 'ueberfaellig', new Date('2027-03-01T00:00:00Z'))
    expect(text).toMatch(/nachholen/)
    expect(text).not.toMatch(/verpasst|versäumt|!/)
  })
})

describe('impfEintraege', () => {
  const impfungen = [
    impfung({ key: 'a-1', fenster: { vonWochen: 7, bisWochen: 12 } }),
    impfung({ key: 'a-2', fenster: { vonMonaten: 4, bisMonaten: 5 } }),
    impfung({ key: 'offen', fenster: null }),
  ]

  it('sortiert Faelliges nach oben und Erledigtes nach unten', () => {
    const now = new Date('2027-03-05T00:00:00Z') // im Fenster von a-2
    const list = impfEintraege(impfungen, GEBURT, [], now)
    expect(list.map((e) => e.key)).toEqual(['a-2', 'a-1', 'offen'])
    expect(list[0]!.status).toBe('faellig')
    expect(list[1]!.status).toBe('ueberfaellig')
    expect(list[2]!.status).toBe('ohneFenster')
  })

  it('uebernimmt Datum, Ort und Notiz aus dem Erledigt-Eintrag', () => {
    const list = impfEintraege(
      impfungen,
      GEBURT,
      [
        {
          id: 'v1',
          kind: 'impfung',
          templateKey: 'a-1',
          doneAt: new Date('2026-12-20T09:00:00Z'),
          ort: 'Ordination Dr. Berger',
          note: 'gut vertragen',
        },
      ],
      new Date('2027-03-05T00:00:00Z'),
    )
    const erledigt = list.find((e) => e.key === 'a-1')!
    expect(erledigt.status).toBe('erledigt')
    expect(erledigt.ort).toBe('Ordination Dr. Berger')
    expect(erledigt.note).toBe('gut vertragen')
    expect(list[list.length - 1]!.key).toBe('a-1')
  })

  it('ignoriert Erledigt-Eintraege der anderen Kategorie', () => {
    const list = impfEintraege(
      impfungen,
      GEBURT,
      [{ id: 'u1', kind: 'untersuchung', templateKey: 'a-1', doneAt: new Date() }],
      new Date('2027-03-05T00:00:00Z'),
    )
    expect(list.find((e) => e.key === 'a-1')!.status).not.toBe('erledigt')
  })

  it('nennt im Untertitel, wogegen die Impfung schuetzt', () => {
    const list = impfEintraege([impfung({ schutzGegen: ['Masern', 'Mumps'] })], GEBURT, [])
    expect(list[0]!.untertitel).toBe('Schutz gegen Masern, Mumps')
  })
})

describe('untersuchungsEintraege', () => {
  it('bildet den Schluessel aus der Nummer', () => {
    const list = untersuchungsEintraege([untersuchung({ nummer: 8 })], GEBURT, [])
    expect(list[0]!.key).toBe('ekp-kind-8')
    expect(list[0]!.titel).toMatch(/^8\. /)
  })

  it('reicht separaterTermin und kbgRelevant durch', () => {
    const list = untersuchungsEintraege(
      [untersuchung({ separaterTermin: true, kbgRelevant: false })],
      GEBURT,
      [],
    )
    expect(list[0]!.separaterTermin).toBe(true)
    expect(list[0]!.kbgRelevant).toBe(false)
  })

  it('behaelt den Wortlaut der Quelle als quellText', () => {
    const list = untersuchungsEintraege([untersuchung()], GEBURT, [])
    expect(list[0]!.quellText).toBe('in der 1. Lebenswoche')
  })
})

describe('kbgFristen', () => {
  const fristen: KbgFrist[] = [
    { key: 'kbg-1', bezeichnung: 'Erste sechs', wann: 'bei Antragstellung', bisMonaten: null, quelle: 'q' },
    { key: 'kbg-2', bezeichnung: 'Weitere vier', wann: 'bis zum 15. Lebensmonat', bisMonaten: 15, quelle: 'q' },
  ]

  it('laesst die an den Antrag gebundene Frist ohne Datum', () => {
    const list = kbgFristen(fristen, GEBURT, new Date('2027-01-01T00:00:00Z'))
    expect(list[0]!.faelligAm).toBeNull()
    expect(list[0]!.statusText).toBe('bei Antragstellung')
  })

  it('rechnet die Monatsfrist auf ein Datum um', () => {
    const list = kbgFristen(fristen, GEBURT, new Date('2027-01-01T00:00:00Z'))
    expect(list[1]!.faelligAm!.toISOString().slice(0, 10)).toBe('2028-01-27')
    expect(list[1]!.status).toBe('faellig')
  })

  it('meldet eine abgelaufene Frist als ueberfaellig', () => {
    const list = kbgFristen(fristen, GEBURT, new Date('2028-06-01T00:00:00Z'))
    expect(list[1]!.status).toBe('ueberfaellig')
  })
})

describe('verlauf', () => {
  it('verteilt die Eintraege auf die ersten fuenf Jahre', () => {
    const eintraege = impfEintraege(
      [
        impfung({ key: 'w7', fenster: { vonWochen: 7, bisWochen: 12 } }),
        impfung({ key: 'm11', fenster: { vonMonaten: 11, bisMonaten: 15 } }),
        impfung({ key: 'm21', fenster: { vonMonaten: 21, bisMonaten: 26 } }),
        impfung({ key: 'ohne', fenster: null }),
      ],
      GEBURT,
      [],
      new Date('2026-11-01T00:00:00Z'),
    )
    const { abschnitte, ohneFenster } = verlauf(eintraege, GEBURT)
    expect(abschnitte.map((a) => a.label)).toEqual([
      'Erstes halbes Jahr',
      '6 bis 12 Monate',
      '2. Lebensjahr',
    ])
    expect(abschnitte[0]!.eintraege.map((e) => e.key)).toEqual(['w7'])
    expect(ohneFenster.map((e) => e.key)).toEqual(['ohne'])
  })

  it('sortiert innerhalb eines Abschnitts nach Datum', () => {
    const eintraege = impfEintraege(
      [
        impfung({ key: 'spaet', fenster: { vonMonaten: 4, bisMonaten: 5 } }),
        impfung({ key: 'frueh', fenster: { vonWochen: 6, bisMonaten: 3 } }),
      ],
      GEBURT,
      [],
      new Date('2026-11-01T00:00:00Z'),
    )
    const { abschnitte } = verlauf(eintraege, GEBURT)
    expect(abschnitte[0]!.eintraege.map((e) => e.key)).toEqual(['frueh', 'spaet'])
  })
})
