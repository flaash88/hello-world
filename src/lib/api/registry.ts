/**
 * Was die API als `type` annimmt.
 *
 * Die Liste wird aus den vorhandenen Registries abgeleitet und nicht neu
 * getippt: kommt in `src/lib/events/types.ts` ein Ereignistyp oder eine
 * Gesundheits-Art dazu, kann die API sie sofort. Ein Test haelt das fest.
 *
 * Die Gesundheits-Arten stehen zusaetzlich als eigene Typen (`temperature`,
 * `medication`, …) zur Verfuegung – fuer eine Automation ist "Temperatur" ein
 * Ereignis und nicht die Unterart eines anderen.
 */
import { EVENT_TYPES, HEALTH_KINDS, type EventType, type HealthKind } from '@/lib/events/types'

export type ApiZiel =
  | { art: 'event'; type: EventType }
  | { art: 'event'; type: 'health'; kind: HealthKind }

/** Alle akzeptierten Werte fuer `type`, abgeleitet aus den Registries. */
export const API_TYPES: string[] = [
  ...EVENT_TYPES,
  // Die Gesundheits-Arten zusaetzlich unter ihrem eigenen Namen. `appointment`
  // gaebe es sonst zweimal – hier kollidiert nichts, weil kein Ereignistyp so
  // heisst; sollte das je passieren, faellt es im Test auf.
  ...HEALTH_KINDS,
]

export function istApiType(value: string): boolean {
  return API_TYPES.includes(value)
}

/** Uebersetzt einen API-Typ in Ereignistyp und ggf. Gesundheits-Art. */
export function zielFor(type: string): ApiZiel | null {
  if ((EVENT_TYPES as readonly string[]).includes(type)) {
    return { art: 'event', type: type as EventType }
  }
  if ((HEALTH_KINDS as readonly string[]).includes(type)) {
    return { art: 'event', type: 'health', kind: type as HealthKind }
  }
  return null
}

/**
 * Kurzform der Felder je Typ – nur fuer die Fehlermeldung und die
 * Dokumentation. Die eigentliche Pruefung macht das Zod-Schema der Kategorie.
 */
export const API_FELDER: Record<string, string[]> = {
  sleep: ['kind', 'location', 'aid', 'endedAt'],
  nursing: ['side', 'leftSec', 'rightSec', 'endedAt'],
  bottle: ['content', 'amountMl', 'leftoverMl'],
  pumping: ['side', 'amountMl', 'leftMl', 'rightMl', 'endedAt'],
  solids: ['foods', 'amount', 'reaction'],
  diaper: ['wet', 'soiled', 'color', 'texture'],
  mood: ['intensity', 'reason'],
  health: ['kind', 'temperatureC', 'medication', 'doseMl', 'doseMg', 'symptom'],
  other: ['kind', 'label'],
  temperature: ['temperatureC', 'measuredAt'],
  medication: ['medication', 'doseMl', 'doseMg', 'repeatHours', 'dauerhaft'],
  symptom: ['symptom'],
  allergy: ['allergy'],
  vaccination: ['vaccine'],
  appointment: ['note'],
}

/**
 * Bequemlichkeit fuer die Windel: `{"wet": true, "soiled": false}` ist das,
 * was ein NFC-Tag schickt – die App kennt intern `kind: wet | dirty | both`.
 */
export function windelArt(input: { wet?: boolean; soiled?: boolean }): 'wet' | 'dirty' | 'both' {
  if (input.wet && input.soiled) return 'both'
  if (input.soiled) return 'dirty'
  return 'wet'
}
