import { EVENT_TYPES, type EventType } from '@/lib/events/types'

/**
 * Startbildschirm: Welche Seite die App beim Oeffnen zeigt. Die Wurzel `/`
 * leitet nur weiter – so bleibt `start_url` im Manifest stabil, egal was
 * eingestellt ist.
 */
export const START_SCREENS = ['dashboard', 'verlauf', 'auswertung', 'schwangerschaft'] as const
export type StartScreen = (typeof START_SCREENS)[number]

export const DASHBOARD_PATH = '/heute'

export const START_SCREEN_OPTIONS: {
  value: StartScreen
  label: string
  hint: string
  path: string
  /** Braucht ein angelegtes Kind. */
  needsChild: boolean
  /** Braucht eine laufende Schwangerschaft. */
  needsPregnancy: boolean
}[] = [
  {
    value: 'dashboard',
    label: 'Heute',
    hint: 'Schnellaktionen, Kreisuhr, Schlafprognose',
    path: DASHBOARD_PATH,
    needsChild: false,
    needsPregnancy: false,
  },
  {
    value: 'verlauf',
    label: 'Verlauf',
    hint: 'Die Liste aller Einträge',
    path: '/verlauf',
    needsChild: true,
    needsPregnancy: false,
  },
  {
    value: 'auswertung',
    label: 'Auswertung',
    hint: 'Zahlen der Woche und Heatmap',
    path: '/auswertung',
    needsChild: true,
    needsPregnancy: false,
  },
  {
    value: 'schwangerschaft',
    label: 'Schwangerschaft',
    hint: 'SSW, Countdown und Wocheninhalt',
    path: '/schwangerschaft',
    needsChild: false,
    needsPregnancy: true,
  },
]

export function parseStartScreen(value: unknown): StartScreen {
  return (START_SCREENS as readonly string[]).includes(String(value))
    ? (value as StartScreen)
    : 'dashboard'
}

/**
 * Ziel der Weiterleitung. Faellt auf das Dashboard zurueck, wenn die
 * gewuenschte Seite gerade nichts anzeigen koennte – ein Startbildschirm, der
 * leer ist, waere schlimmer als der falsche.
 */
export function startScreenPath(
  value: unknown,
  {
    hasChild,
    hasPregnancy,
    erlaubt = () => true,
  }: {
    hasChild: boolean
    hasPregnancy: boolean
    /** Ist die Zielseite gerade eingeschaltet? Siehe lib/settings/features.ts. */
    erlaubt?: (pfad: string) => boolean
  },
): string {
  const screen = parseStartScreen(value)
  const option = START_SCREEN_OPTIONS.find((entry) => entry.value === screen)
  if (!option) return DASHBOARD_PATH
  if (option.needsChild && !hasChild) return DASHBOARD_PATH
  if (option.needsPregnancy && !hasPregnancy) return DASHBOARD_PATH
  // Ein Startbildschirm, den es gerade nicht gibt, waere schlimmer als der
  // falsche – dann lieber zurueck aufs Dashboard.
  if (!erlaubt(option.path)) return DASHBOARD_PATH
  return option.path
}

/** Schnellaktionen auf dem Startbildschirm. */
export const DEFAULT_QUICK_ACTIONS: EventType[] = ['sleep', 'nursing', 'bottle', 'diaper']
export const MAX_QUICK_ACTIONS = 6

export function parseQuickActions(value: unknown): EventType[] {
  if (!Array.isArray(value)) return DEFAULT_QUICK_ACTIONS
  const filtered = value.filter(
    (entry): entry is EventType =>
      typeof entry === 'string' && (EVENT_TYPES as readonly string[]).includes(entry),
  )
  return filtered.length > 0 ? filtered.slice(0, MAX_QUICK_ACTIONS) : DEFAULT_QUICK_ACTIONS
}
