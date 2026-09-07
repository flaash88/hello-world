import { describe, expect, it } from 'vitest'
import {
  FENSTER_MEDIKAMENT_MINUTEN,
  FENSTER_MINUTEN,
  FENSTER_SCHLAF_MINUTEN,
  duplikatLabel,
  fensterMinuten,
  findeDuplikat,
  hinweisText,
  istDeutlich,
  istPruefbar,
  zusammengefuehrtePayload,
  type DuplikatKandidat,
  type Neueintrag,
} from './duplicates'

const T0 = new Date('2027-01-15T08:00:00.000Z')
const min = (n: number) => new Date(T0.getTime() + n * 60_000)

function neu(over: Partial<Neueintrag> = {}): Neueintrag {
  return {
    id: 'neu',
    type: 'bottle',
    startedAt: T0,
    endedAt: null,
    payload: {},
    createdById: 'papa',
    ...over,
  }
}

function kandidat(over: Partial<DuplikatKandidat> = {}): DuplikatKandidat {
  return {
    id: 'alt',
    type: 'bottle',
    startedAt: T0,
    endedAt: null,
    payload: {},
    createdById: 'mama',
    createdByName: 'Sarah',
    ...over,
  }
}

describe('Zeitfenster', () => {
  it('nimmt 10 Minuten, Schlaf 20, Medikamente 30', () => {
    expect(FENSTER_MINUTEN).toBe(10)
    expect(FENSTER_SCHLAF_MINUTEN).toBe(20)
    expect(FENSTER_MEDIKAMENT_MINUTEN).toBe(30)

    expect(fensterMinuten({ type: 'bottle', payload: {} })).toBe(10)
    expect(fensterMinuten({ type: 'sleep', payload: {} })).toBe(20)
    expect(fensterMinuten({ type: 'health', payload: { kind: 'medication' } })).toBe(30)
    expect(fensterMinuten({ type: 'health', payload: { kind: 'temperature' } })).toBe(10)
  })
})

describe('istPruefbar', () => {
  it('prüft die Alltagskategorien', () => {
    for (const type of ['sleep', 'nursing', 'bottle', 'pumping', 'solids', 'diaper']) {
      expect(istPruefbar({ type, payload: {} }), type).toBe(true)
    }
  })

  it('lässt Impfungen aus – die hängen an ihrem Schlüssel', () => {
    expect(istPruefbar({ type: 'health', payload: { kind: 'vaccination' } })).toBe(false)
  })

  it('prüft Temperatur und Medikamente sehr wohl', () => {
    expect(istPruefbar({ type: 'health', payload: { kind: 'medication' } })).toBe(true)
    expect(istPruefbar({ type: 'health', payload: { kind: 'temperature' } })).toBe(true)
  })

  it('lässt Kategorien außerhalb des Ereignismodells aus', () => {
    expect(istPruefbar({ type: 'mood', payload: {} })).toBe(false)
    expect(istPruefbar({ type: 'other', payload: {} })).toBe(false)
  })
})

describe('findeDuplikat', () => {
  it('findet den Eintrag der anderen Person im Fenster', () => {
    expect(findeDuplikat(neu(), [kandidat({ startedAt: min(4) })])?.id).toBe('alt')
  })

  it('meldet nichts außerhalb des Fensters', () => {
    expect(findeDuplikat(neu(), [kandidat({ startedAt: min(11) })])).toBeNull()
    // Für Schlaf reichen 11 Minuten dagegen noch nicht aus.
    expect(
      findeDuplikat(neu({ type: 'sleep' }), [kandidat({ type: 'sleep', startedAt: min(11) })])?.id,
    ).toBe('alt')
  })

  it('meldet nichts, wenn dieselbe Person zweimal einträgt', () => {
    expect(findeDuplikat(neu(), [kandidat({ createdById: 'papa', startedAt: min(2) })])).toBeNull()
  })

  it('vergleicht nur gleiche Kategorien', () => {
    expect(findeDuplikat(neu(), [kandidat({ type: 'diaper', startedAt: min(2) })])).toBeNull()
  })

  it('hält Temperatur und Medikament auseinander', () => {
    const temperatur = neu({ type: 'health', payload: { kind: 'temperature' } })
    const medikament = kandidat({ type: 'health', payload: { kind: 'medication' } })
    expect(findeDuplikat(temperatur, [medikament])).toBeNull()
  })

  it('verlangt bei Zeiträumen eine Überlappung', () => {
    const schlaf = neu({ type: 'sleep', startedAt: T0, endedAt: min(30) })
    // Beginnt 15 Minuten später, endet aber vor dem neuen Beginn – unmöglich,
    // aber der Test sichert die Bedingung ab.
    const ohneUeberlappung = kandidat({
      type: 'sleep',
      startedAt: min(-15),
      endedAt: min(-1),
    })
    expect(findeDuplikat(schlaf, [ohneUeberlappung])).toBeNull()

    const mitUeberlappung = kandidat({ type: 'sleep', startedAt: min(-5), endedAt: min(25) })
    expect(findeDuplikat(schlaf, [mitUeberlappung])?.id).toBe('alt')
  })

  it('nimmt bei mehreren Treffern den zeitlich nächsten', () => {
    const treffer = findeDuplikat(neu(), [
      kandidat({ id: 'weit', startedAt: min(8) }),
      kandidat({ id: 'nah', startedAt: min(1) }),
    ])
    expect(treffer?.id).toBe('nah')
  })

  it('vergleicht einen Eintrag nicht mit sich selbst', () => {
    // Der eigene Eintrag steht in der Kandidatenliste – er darf nie treffen.
    expect(findeDuplikat(neu({ id: 'x' }), [kandidat({ id: 'x', createdById: 'mama' })])).toBeNull()
    expect(
      findeDuplikat(neu({ id: 'x' }), [
        kandidat({ id: 'x', createdById: 'mama' }),
        kandidat({ id: 'y', createdById: 'mama', startedAt: min(2) }),
      ])?.id,
    ).toBe('y')
  })

  it('meldet bei einer Impfung nichts', () => {
    const impfung = neu({ type: 'health', payload: { kind: 'vaccination' } })
    expect(
      findeDuplikat(impfung, [kandidat({ type: 'health', payload: { kind: 'vaccination' } })]),
    ).toBeNull()
  })
})

describe('zusammengefuehrtePayload', () => {
  it('ergänzt nur, was im älteren Eintrag fehlt', () => {
    expect(
      zusammengefuehrtePayload({ content: 'formula', amountMl: 120 }, { content: 'breast', leftoverMl: 20 }),
    ).toEqual({ content: 'formula', amountMl: 120, leftoverMl: 20 })
  })

  it('überschreibt nichts mit leeren Werten', () => {
    expect(zusammengefuehrtePayload({ amountMl: 120 }, { amountMl: null })).toEqual({
      amountMl: 120,
    })
  })

  it('füllt leere Felder des älteren Eintrags auf', () => {
    expect(zusammengefuehrtePayload({ amountMl: null }, { amountMl: 90 })).toEqual({ amountMl: 90 })
  })
})

describe('Hinweistext', () => {
  it('nennt Person, Zeit und Kategorie', () => {
    expect(hinweisText('Sarah', 'eine Flasche', 4)).toBe(
      'Sarah hat vor 4 Minuten auch eine Flasche eingetragen.',
    )
    expect(hinweisText('Sarah', 'eine Windel', 1)).toContain('vor einer Minute')
    expect(hinweisText('Sarah', 'eine Windel', 0)).toContain('gerade eben')
  })

  it('benennt Gesundheitseinträge genauer als nur „Gesundheit"', () => {
    expect(duplikatLabel({ type: 'health', payload: { kind: 'medication' } })).toBe(
      'eine Medikamentengabe',
    )
    expect(duplikatLabel({ type: 'health', payload: { kind: 'temperature' } })).toBe(
      'eine Temperatur',
    )
    expect(duplikatLabel({ type: 'bottle', payload: {} })).toBe('eine Flasche')
  })

  it('markiert Medikamentengaben als den deutlicheren Fall', () => {
    expect(istDeutlich({ type: 'health', payload: { kind: 'medication' } })).toBe(true)
    expect(istDeutlich({ type: 'bottle', payload: {} })).toBe(false)
  })
})
