/**
 * Aktionen, die eine Verknuepfung vom Startbildschirm ausloesen kann.
 *
 * Der Parameter steht in der URL (`/heute?action=sleep-start`) und wird nach
 * dem Ausfuehren mit `history.replaceState` entfernt – sonst startet ein
 * Neuladen der Seite den Timer ein zweites Mal.
 */
export const SHORTCUT_ACTIONS = ['sleep-start', 'nursing-start', 'diaper'] as const
export type ShortcutAction = (typeof SHORTCUT_ACTIONS)[number]

export const SHORTCUT_PARAM = 'action'

export type ShortcutPlan =
  | { art: 'timer'; type: 'sleep' | 'nursing' }
  | { art: 'dialog'; type: 'diaper' }

const PLAN: Record<ShortcutAction, ShortcutPlan> = {
  'sleep-start': { art: 'timer', type: 'sleep' },
  'nursing-start': { art: 'timer', type: 'nursing' },
  diaper: { art: 'dialog', type: 'diaper' },
}

export function istShortcutAction(value: string | null | undefined): value is ShortcutAction {
  return (
    value !== null && value !== undefined && (SHORTCUT_ACTIONS as readonly string[]).includes(value)
  )
}

export function planFor(action: ShortcutAction): ShortcutPlan {
  return PLAN[action]
}

/**
 * Laeuft bereits ein Timer derselben Kategorie, wird nichts Neues gestartet –
 * gezeigt wird der laufende. Zweimal auf dieselbe Verknuepfung zu tippen darf
 * nicht zwei Schlafbloecke erzeugen.
 */
export function sollStarten(plan: ShortcutPlan, laufendeTypen: readonly string[]): boolean {
  return plan.art === 'timer' && !laufendeTypen.includes(plan.type)
}

/** Die URL ohne den Aktionsparameter – fuer `history.replaceState`. */
export function urlOhneAktion(href: string): string {
  try {
    const url = new URL(href)
    url.searchParams.delete(SHORTCUT_PARAM)
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return href
  }
}
