import type { EventType } from '@/lib/events/types'

/**
 * Was die App anzeigt.
 *
 * Der Auslieferungszustand ist bewusst klein. Alles, was rechnet, vergleicht
 * oder vorhersagt, ist zunaechst aus – nicht weil es schlecht waere, sondern
 * weil eine App, die im Wochenbett Vorgaben macht, mehr Schaden anrichtet als
 * ihr Nutzen wert ist. Wer mehr will, schaltet es einzeln dazu.
 *
 * Abgeschaltete Bereiche werden nicht ausgegraut, sondern gar nicht erst
 * geladen: sie verschwinden aus der Navigation, ihre Routen leiten auf das
 * Dashboard um, ihre Berechnungen laufen nicht. Eine graue Kachel waere eine
 * Einladung, sie doch anzutippen.
 */

export const FEATURE_KEYS = [
  'schlafanalyse',
  'kreisuhr',
  'auswertung',
  'entwicklung',
  'perzentile',
  'elternCheckin',
] as const

export type FeatureKey = (typeof FEATURE_KEYS)[number]

export const FEATURE_LEVELS = ['protokoll', 'erweitert', 'voll'] as const
export type FeatureLevel = (typeof FEATURE_LEVELS)[number]

export const DEFAULT_FEATURE_LEVEL: FeatureLevel = 'protokoll'

export type FeatureInfo = {
  key: FeatureKey
  label: string
  /** Was genau verschwindet, wenn der Schalter aus ist. */
  hint: string
  /**
   * Routen, die dieser Bereich besitzt. Ist er aus, leiten sie auf `/heute`
   * um. Bereiche ohne eigene Route (Karten auf dem Dashboard) haben eine
   * leere Liste.
   */
  routes: string[]
}

export const FEATURES: Record<FeatureKey, FeatureInfo> = {
  schlafanalyse: {
    key: 'schlafanalyse',
    label: 'Schlafrhythmus',
    hint: 'Wachfenster, Schlafdruck und die Vorhersage des nächsten Fensters.',
    routes: [],
  },
  kreisuhr: {
    key: 'kreisuhr',
    label: 'Der Tag im Kreis',
    hint: 'Die 24-Stunden-Uhr auf dem Startbildschirm.',
    routes: [],
  },
  auswertung: {
    key: 'auswertung',
    label: 'Auswertung',
    hint: 'Zahlen der Woche, Heatmap, Wochenrückblick und der Wochenbericht als PDF.',
    routes: ['/auswertung'],
  },
  entwicklung: {
    key: 'entwicklung',
    label: 'Entwicklung',
    hint: 'Wocheninhalte, Übungen, Sprungfenster und Meilensteine.',
    routes: ['/entwicklung'],
  },
  perzentile: {
    key: 'perzentile',
    label: 'Perzentilkurven',
    hint: 'Die WHO-Kurven im Wachstum. Gewicht, Länge und Kopfumfang bleiben sichtbar.',
    routes: [],
  },
  elternCheckin: {
    key: 'elternCheckin',
    label: 'Eltern-Check-in',
    hint: 'Die tägliche Frage nach Stimmung, Energie und Schlaf – und das daraus abgeleitete Signal.',
    routes: [],
  },
}

/**
 * Was eine Stufe einschaltet. `protokoll` schaltet nichts ein; `erweitert`
 * nimmt dazu, was nachts wirklich hilft; `voll` alles.
 */
const LEVEL_FEATURES: Record<FeatureLevel, FeatureKey[]> = {
  protokoll: [],
  erweitert: ['schlafanalyse', 'kreisuhr'],
  voll: [...FEATURE_KEYS],
}

export const LEVEL_INFO: Record<FeatureLevel, { label: string; hint: string }> = {
  protokoll: {
    label: 'Nur Protokoll',
    hint: 'Mitschreiben, nachlesen, ausdrucken. Nichts, was rechnet oder vergleicht.',
  },
  erweitert: {
    label: 'Erweitert',
    hint: 'Dazu der Schlafrhythmus und die Tagesuhr.',
  },
  voll: {
    label: 'Alles',
    hint: 'Auch Auswertungen, Entwicklungsinhalte, Perzentilkurven und der Eltern-Check-in.',
  },
}

export function parseFeatureLevel(value: unknown): FeatureLevel {
  return (FEATURE_LEVELS as readonly string[]).includes(String(value))
    ? (value as FeatureLevel)
    : DEFAULT_FEATURE_LEVEL
}

/**
 * Einzelschalter als Abweichung von der Stufe. Wer nur die Kreisuhr will,
 * bleibt auf `protokoll` und setzt `{ kreisuhr: true }` – die Stufe bleibt
 * dabei stehen, damit „zurück auf Protokoll" ein Schalter und keine Rechnung
 * ist.
 */
export type FeatureOverrides = Partial<Record<FeatureKey, boolean>>

export function parseFeatureOverrides(value: unknown): FeatureOverrides {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const raw = value as Record<string, unknown>
  const result: FeatureOverrides = {}
  for (const key of FEATURE_KEYS) {
    if (typeof raw[key] === 'boolean') result[key] = raw[key] as boolean
  }
  return result
}

/** Die vier Kategorien, die auch in der Pause bleiben. */
export const GRUNDKATEGORIEN: EventType[] = ['nursing', 'bottle', 'diaper', 'sleep']

export type FeatureInput = {
  level?: unknown
  overrides?: unknown
  /** Bis wann die Pause laeuft. Vergangene Zeitpunkte zaehlen nicht. */
  pauseUntil?: Date | string | null
}

export type FeatureState = {
  level: FeatureLevel
  overrides: FeatureOverrides
  /** Laeuft gerade eine Pause? */
  pausiert: boolean
  pauseBis: Date | null
  /** Effektiv eingeschaltete Bereiche. */
  aktiv: Set<FeatureKey>
}

function pauseBisAus(value: FeatureInput['pauseUntil'], jetzt: Date): Date | null {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.getTime() > jetzt.getTime() ? date : null
}

/**
 * Rechnet Stufe, Einzelschalter und Pause zu dem zusammen, was die App
 * tatsaechlich anzeigt. Reine Funktion – jede Seite darf sie aufrufen.
 */
export function featureState(input: FeatureInput, jetzt: Date = new Date()): FeatureState {
  const level = parseFeatureLevel(input.level)
  const overrides = parseFeatureOverrides(input.overrides)
  const pauseBis = pauseBisAus(input.pauseUntil, jetzt)

  const aktiv = new Set<FeatureKey>()
  if (!pauseBis) {
    for (const key of LEVEL_FEATURES[level]) aktiv.add(key)
    for (const key of FEATURE_KEYS) {
      const override = overrides[key]
      if (override === true) aktiv.add(key)
      if (override === false) aktiv.delete(key)
    }
  }

  return { level, overrides, pausiert: Boolean(pauseBis), pauseBis, aktiv }
}

export function istAktiv(state: FeatureState, key: FeatureKey): boolean {
  return state.aktiv.has(key)
}

/**
 * Wie der Schalter in den Einstellungen steht – unabhaengig davon, ob gerade
 * eine Pause laeuft. Waehrend der Pause zeigt die Einstellungsseite weiter,
 * was danach wieder da ist.
 */
export function schalterStand(state: FeatureState, key: FeatureKey): boolean {
  const override = state.overrides[key]
  if (typeof override === 'boolean') return override
  return LEVEL_FEATURES[state.level].includes(key)
}

/** Wie die Einzelschalter stehen, wenn nur die Stufe gilt. */
export function schalterFuerStufe(level: FeatureLevel): Record<FeatureKey, boolean> {
  const result = {} as Record<FeatureKey, boolean>
  for (const key of FEATURE_KEYS) result[key] = LEVEL_FEATURES[level].includes(key)
  return result
}

/**
 * Neue Abweichungen nach dem Umlegen eines Schalters. Deckt sich der Wunsch
 * mit der Stufe, faellt die Abweichung wieder weg – sonst sammeln sich
 * Eintraege an, die nichts bewirken.
 */
export function mitSchalter(
  level: FeatureLevel,
  overrides: FeatureOverrides,
  key: FeatureKey,
  an: boolean,
): FeatureOverrides {
  const next: FeatureOverrides = { ...overrides }
  if (LEVEL_FEATURES[level].includes(key) === an) delete next[key]
  else next[key] = an
  return next
}

/**
 * Zu welchem Bereich eine Route gehoert – oder `null`, wenn sie immer
 * erreichbar ist. Unterpfade zaehlen mit: `/entwicklung/uebungen` haengt an
 * demselben Schalter wie `/entwicklung`.
 */
export function featureFuerRoute(pfad: string): FeatureKey | null {
  for (const info of Object.values(FEATURES)) {
    for (const route of info.routes) {
      if (pfad === route || pfad.startsWith(`${route}/`)) return info.key
    }
  }
  return null
}

/** Ist diese Route gerade erreichbar? */
export function routeErlaubt(state: FeatureState, pfad: string): boolean {
  const key = featureFuerRoute(pfad)
  return key === null || state.aktiv.has(key)
}

export const PAUSE_DAUERN = [
  { stunden: 24, label: 'Bis morgen' },
  { stunden: 24 * 3, label: 'Drei Tage' },
  { stunden: 24 * 7, label: 'Eine Woche' },
  { stunden: 24 * 30, label: 'Einen Monat' },
] as const

export function pauseEnde(stunden: number, jetzt: Date = new Date()): Date {
  return new Date(jetzt.getTime() + stunden * 3600_000)
}
