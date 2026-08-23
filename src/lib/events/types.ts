/**
 * Der polymorphe Event-Typ.
 *
 * Ein Event hat immer `type`, `startedAt` und eine typisierte `payload`.
 * Timer-Events haben zusaetzlich `endedAt` und koennen pausiert werden;
 * Punkt-Events (Windel, Temperatur, ...) nur `startedAt`.
 */
export const EVENT_TYPES = [
  'sleep',
  'nursing',
  'bottle',
  'pumping',
  'solids',
  'diaper',
  'mood',
  'health',
  'other',
] as const

export type EventType = (typeof EVENT_TYPES)[number]

export type EventCategory = {
  type: EventType
  label: string
  /** Plural fuer Listen und Statistik-Ueberschriften. */
  plural: string
  /** Farb-Token aus tailwind.config.ts (`cat.<key>`). */
  color: string
  /** Ist der Eintrag ein Zeitraum mit Start und Ende? */
  timed: boolean
  /**
   * Startet die Schnellaktion den Timer sofort (ein Tap), statt zuerst das
   * Eingabeblatt zu oeffnen? True fuer alles, wo die Zeit zaehlt und die
   * Details nachgetragen werden koennen.
   */
  instantStart: boolean
}

export const EVENT_CATEGORIES: Record<EventType, EventCategory> = {
  sleep: { type: 'sleep', label: 'Schlaf', plural: 'Schlaf', color: 'sleep', timed: true, instantStart: true },
  nursing: { type: 'nursing', label: 'Stillen', plural: 'Stillmahlzeiten', color: 'feed', timed: true, instantStart: true },
  // Flasche braucht eine Menge – ohne Eingabeblatt waere der Eintrag wertlos.
  bottle: { type: 'bottle', label: 'Flasche', plural: 'Flaschen', color: 'bottle', timed: true, instantStart: false },
  pumping: { type: 'pumping', label: 'Abpumpen', plural: 'Abpump-Einheiten', color: 'pump', timed: true, instantStart: true },
  solids: { type: 'solids', label: 'Beikost', plural: 'Beikost-Mahlzeiten', color: 'solids', timed: false, instantStart: false },
  diaper: { type: 'diaper', label: 'Windel', plural: 'Windeln', color: 'diaper', timed: false, instantStart: false },
  mood: { type: 'mood', label: 'Stimmung', plural: 'Stimmungseinträge', color: 'mood', timed: true, instantStart: false },
  health: { type: 'health', label: 'Gesundheit', plural: 'Gesundheitseinträge', color: 'health', timed: false, instantStart: false },
  other: { type: 'other', label: 'Sonstiges', plural: 'Sonstiges', color: 'other', timed: true, instantStart: false },
}

export function isEventType(value: string): value is EventType {
  return (EVENT_TYPES as readonly string[]).includes(value)
}

// ------------------------------------------------------------- Schlaf ------

export const SLEEP_KINDS = ['nap', 'night'] as const
export type SleepKind = (typeof SLEEP_KINDS)[number]
export const SLEEP_KIND_LABEL: Record<SleepKind, string> = { nap: 'Nickerchen', night: 'Nachtschlaf' }

export const SLEEP_LOCATIONS = ['bett', 'beistellbett', 'kinderwagen', 'trage', 'arm', 'auto', 'unterwegs'] as const
export const SLEEP_LOCATION_LABEL: Record<string, string> = {
  bett: 'Eigenes Bett',
  beistellbett: 'Beistellbett',
  kinderwagen: 'Kinderwagen',
  trage: 'Trage oder Tuch',
  arm: 'Am Arm',
  auto: 'Auto',
  unterwegs: 'Unterwegs',
}

export const SLEEP_AIDS = ['stillen', 'flasche', 'schnuller', 'tragen', 'schaukeln', 'weisses-rauschen', 'singen', 'allein'] as const
export const SLEEP_AID_LABEL: Record<string, string> = {
  stillen: 'Stillen',
  flasche: 'Flasche',
  schnuller: 'Schnuller',
  tragen: 'Tragen',
  schaukeln: 'Schaukeln',
  'weisses-rauschen': 'Weißes Rauschen',
  singen: 'Singen',
  allein: 'Allein eingeschlafen',
}

// ------------------------------------------------------------ Stillen ------

export const NURSING_SIDES = ['left', 'right', 'both'] as const
export type NursingSide = (typeof NURSING_SIDES)[number]
export const NURSING_SIDE_LABEL: Record<NursingSide, string> = {
  left: 'Links',
  right: 'Rechts',
  both: 'Beide',
}

// ------------------------------------------------------------ Flasche ------

export const BOTTLE_CONTENTS = ['breastmilk', 'formula', 'follow-on', 'water', 'other'] as const
export const BOTTLE_CONTENT_LABEL: Record<string, string> = {
  breastmilk: 'Muttermilch',
  formula: 'Pre-Nahrung',
  'follow-on': 'Folgemilch',
  water: 'Wasser',
  other: 'Anderes',
}

// ------------------------------------------------------------- Windel ------

export const DIAPER_KINDS = ['wet', 'dirty', 'both', 'dry'] as const
export type DiaperKind = (typeof DIAPER_KINDS)[number]
export const DIAPER_KIND_LABEL: Record<DiaperKind, string> = {
  wet: 'Nass',
  dirty: 'Voll',
  both: 'Beides',
  dry: 'Trocken',
}

/** Farben mit kurzer Beschreibung – im Halbdunkeln hilft der Text mehr als der Farbfleck. */
export const STOOL_COLORS = [
  { value: 'yellow', label: 'Gelb', hint: 'Typisch bei Muttermilch', swatch: '#E3B23C' },
  { value: 'mustard', label: 'Senfgelb', hint: 'Oft mit Körnchen', swatch: '#D89B1C' },
  { value: 'green', label: 'Grün', hint: 'Kommt vor, meist harmlos', swatch: '#6B8E4E' },
  { value: 'brown', label: 'Braun', hint: 'Üblich ab Beikost', swatch: '#7A5230' },
  { value: 'dark', label: 'Sehr dunkel', hint: 'Mekonium in den ersten Tagen', swatch: '#2E2A26' },
  { value: 'red', label: 'Rötlich', hint: 'Bitte ärztlich abklären', swatch: '#A6392F' },
  { value: 'white', label: 'Weißlich oder grau', hint: 'Bitte ärztlich abklären', swatch: '#D8D3CB' },
] as const

export const STOOL_TEXTURES = [
  { value: 'liquid', label: 'Flüssig', hint: 'Wie Wasser' },
  { value: 'seedy', label: 'Körnig', hint: 'Typisch bei Muttermilch' },
  { value: 'creamy', label: 'Cremig', hint: 'Wie Senf' },
  { value: 'soft', label: 'Weich geformt', hint: 'Behält grob die Form' },
  { value: 'firm', label: 'Fest', hint: 'Geformte Würstchen' },
  { value: 'hard', label: 'Hart, in Kügelchen', hint: 'Kann auf Verstopfung hindeuten' },
] as const

// ---------------------------------------------------------- Stimmung -------

export const MOOD_REASONS = [
  'hunger',
  'muede',
  'windel',
  'bauchweh',
  'zahnen',
  'ueberreizt',
  'langeweile',
  'naehe',
  'unbekannt',
] as const
export const MOOD_REASON_LABEL: Record<string, string> = {
  hunger: 'Hunger',
  muede: 'Müdigkeit',
  windel: 'Windel',
  bauchweh: 'Bauchweh oder Blähungen',
  zahnen: 'Zahnen',
  ueberreizt: 'Überreizt',
  langeweile: 'Langeweile',
  naehe: 'Braucht Nähe',
  unbekannt: 'Unklar',
}

// -------------------------------------------------------- Gesundheit -------

export const HEALTH_KINDS = [
  'temperature',
  'medication',
  'symptom',
  'allergy',
  'vaccination',
  'appointment',
] as const
export type HealthKind = (typeof HEALTH_KINDS)[number]
export const HEALTH_KIND_LABEL: Record<HealthKind, string> = {
  temperature: 'Temperatur',
  medication: 'Medikament',
  symptom: 'Symptom',
  allergy: 'Allergie',
  vaccination: 'Impfung',
  appointment: 'Arzttermin',
}

// --------------------------------------------------------- Sonstiges -------

export const OTHER_KINDS = ['bath', 'teething', 'walk', 'tummytime', 'play', 'note'] as const
export const OTHER_KIND_LABEL: Record<string, string> = {
  bath: 'Baden',
  teething: 'Zahnen',
  walk: 'Spaziergang',
  tummytime: 'Bauchlage',
  play: 'Spielen',
  note: 'Notiz',
}
