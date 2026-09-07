import { describe, expect, it } from 'vitest'
import {
  FEATURE_KEYS,
  FEATURES,
  featureFuerRoute,
  featureState,
  istAktiv,
  mitSchalter,
  parseFeatureLevel,
  parseFeatureOverrides,
  pauseEnde,
  schalterFuerStufe,
  routeErlaubt,
  schalterStand,
} from './features'

const JETZT = new Date('2026-08-23T10:00:00Z')

describe('parseFeatureLevel', () => {
  it('faellt auf den Protokollmodus zurueck', () => {
    expect(parseFeatureLevel(undefined)).toBe('protokoll')
    expect(parseFeatureLevel('unfug')).toBe('protokoll')
    expect(parseFeatureLevel(null)).toBe('protokoll')
  })

  it('nimmt bekannte Stufen an', () => {
    expect(parseFeatureLevel('erweitert')).toBe('erweitert')
    expect(parseFeatureLevel('voll')).toBe('voll')
  })
})

describe('parseFeatureOverrides', () => {
  it('ignoriert alles, was kein bekannter Schalter ist', () => {
    expect(parseFeatureOverrides({ kreisuhr: true, quatsch: true, auswertung: 'ja' })).toEqual({
      kreisuhr: true,
    })
  })

  it('vertraegt Unsinn als Eingabe', () => {
    expect(parseFeatureOverrides(null)).toEqual({})
    expect(parseFeatureOverrides('protokoll')).toEqual({})
    expect(parseFeatureOverrides([1, 2])).toEqual({})
  })
})

describe('featureState', () => {
  it('liefert im Auslieferungszustand keinen einzigen Bereich', () => {
    const state = featureState({}, JETZT)
    expect(state.level).toBe('protokoll')
    expect(state.aktiv.size).toBe(0)
  })

  it('schaltet in der Stufe erweitert Schlaf und Kreisuhr ein, sonst nichts', () => {
    const state = featureState({ level: 'erweitert' }, JETZT)
    expect(istAktiv(state, 'schlafanalyse')).toBe(true)
    expect(istAktiv(state, 'kreisuhr')).toBe(true)
    expect(istAktiv(state, 'auswertung')).toBe(false)
    expect(istAktiv(state, 'entwicklung')).toBe(false)
    expect(istAktiv(state, 'elternCheckin')).toBe(false)
  })

  it('schaltet in der Stufe voll alles ein', () => {
    const state = featureState({ level: 'voll' }, JETZT)
    expect(state.aktiv.size).toBe(FEATURE_KEYS.length)
  })

  it('laesst einen einzelnen Schalter die Stufe ueberstimmen – in beide Richtungen', () => {
    const nurUhr = featureState({ level: 'protokoll', overrides: { kreisuhr: true } }, JETZT)
    expect([...nurUhr.aktiv]).toEqual(['kreisuhr'])

    const vollOhneCheckin = featureState(
      { level: 'voll', overrides: { elternCheckin: false } },
      JETZT,
    )
    expect(istAktiv(vollOhneCheckin, 'elternCheckin')).toBe(false)
    expect(istAktiv(vollOhneCheckin, 'auswertung')).toBe(true)
  })
})

describe('Pause', () => {
  it('schaltet waehrend der Pause alles ab, auch bei Stufe voll', () => {
    const state = featureState({ level: 'voll', pauseUntil: '2026-08-30T10:00:00Z' }, JETZT)
    expect(state.pausiert).toBe(true)
    expect(state.aktiv.size).toBe(0)
  })

  it('ist nach dem Ende wieder vorbei', () => {
    const state = featureState({ level: 'voll', pauseUntil: '2026-08-22T10:00:00Z' }, JETZT)
    expect(state.pausiert).toBe(false)
    expect(state.aktiv.size).toBe(FEATURE_KEYS.length)
  })

  it('vertraegt einen kaputten Zeitpunkt', () => {
    const state = featureState({ level: 'voll', pauseUntil: 'irgendwann' }, JETZT)
    expect(state.pausiert).toBe(false)
  })

  it('zeigt in den Einstellungen weiter, was nach der Pause zurueckkommt', () => {
    const state = featureState({ level: 'voll', pauseUntil: '2026-08-30T10:00:00Z' }, JETZT)
    expect(istAktiv(state, 'auswertung')).toBe(false)
    expect(schalterStand(state, 'auswertung')).toBe(true)
  })

  it('rechnet das Ende aus Stunden aus', () => {
    expect(pauseEnde(24, JETZT).toISOString()).toBe('2026-08-24T10:00:00.000Z')
  })
})

describe('schalterFuerStufe', () => {
  it('beschreibt jede Stufe vollständig', () => {
    expect(schalterFuerStufe('protokoll')).toEqual({
      schlafanalyse: false,
      kreisuhr: false,
      auswertung: false,
      entwicklung: false,
      perzentile: false,
      elternCheckin: false,
    })
    expect(schalterFuerStufe('erweitert')).toMatchObject({
      schlafanalyse: true,
      kreisuhr: true,
      auswertung: false,
    })
    expect(Object.values(schalterFuerStufe('voll')).every(Boolean)).toBe(true)
  })

  it('deckt sich mit dem, was die Stufe wirklich einschaltet', () => {
    for (const level of ['protokoll', 'erweitert', 'voll'] as const) {
      const state = featureState({ level }, JETZT)
      for (const key of FEATURE_KEYS) {
        expect(schalterFuerStufe(level)[key]).toBe(state.aktiv.has(key))
      }
    }
  })
})

describe('mitSchalter', () => {
  it('merkt sich nur echte Abweichungen von der Stufe', () => {
    // In "voll" ist die Auswertung ohnehin an – der Wunsch "an" ist keine Abweichung.
    expect(mitSchalter('voll', {}, 'auswertung', true)).toEqual({})
    expect(mitSchalter('voll', {}, 'auswertung', false)).toEqual({ auswertung: false })
  })

  it('raeumt eine Abweichung weg, sobald sie mit der Stufe uebereinstimmt', () => {
    expect(mitSchalter('protokoll', { kreisuhr: true }, 'kreisuhr', false)).toEqual({})
  })
})

describe('Routen', () => {
  it('ordnet Unterpfade demselben Schalter zu', () => {
    expect(featureFuerRoute('/entwicklung')).toBe('entwicklung')
    expect(featureFuerRoute('/entwicklung/uebungen')).toBe('entwicklung')
    expect(featureFuerRoute('/auswertung')).toBe('auswertung')
  })

  it('laesst Routen ohne Schalter in Ruhe', () => {
    expect(featureFuerRoute('/heute')).toBe(null)
    expect(featureFuerRoute('/protokoll')).toBe(null)
    expect(featureFuerRoute('/notfall')).toBe(null)
    expect(featureFuerRoute('/verlauf')).toBe(null)
  })

  it('verwechselt keine Praefixe', () => {
    expect(featureFuerRoute('/auswertungen-archiv')).toBe(null)
  })

  it('sperrt abgeschaltete Routen und laesst die uebrigen offen', () => {
    const state = featureState({}, JETZT)
    expect(routeErlaubt(state, '/auswertung')).toBe(false)
    expect(routeErlaubt(state, '/entwicklung/woche')).toBe(false)
    expect(routeErlaubt(state, '/heute')).toBe(true)
    expect(routeErlaubt(state, '/protokoll')).toBe(true)
  })
})

describe('FEATURES', () => {
  it('beschreibt jeden Schalter', () => {
    for (const key of FEATURE_KEYS) {
      expect(FEATURES[key].label.length).toBeGreaterThan(0)
      expect(FEATURES[key].hint.length).toBeGreaterThan(0)
    }
  })

  it('kommt ohne Ausrufezeichen und ohne Aufforderung aus', () => {
    for (const key of FEATURE_KEYS) {
      expect(FEATURES[key].hint).not.toMatch(/!/)
      expect(FEATURES[key].hint).not.toMatch(/\bschalte\b|\baktiviere\b|\bprobier\b/i)
    }
  })
})
