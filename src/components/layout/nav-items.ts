import { DASHBOARD_PATH } from '@/lib/settings/display'

/**
 * Nur serialisierbare Werte: Die Tab-Leiste ist eine Client-Komponente und
 * bekommt ihre Ziele vom Server. Symbole werden dort anhand des Schlüssels
 * zugeordnet.
 */
export type NavIconKey =
  | 'home'
  | 'history'
  | 'development'
  | 'stats'
  | 'journal'
  | 'parents'
  | 'pregnancy'
  | 'more'
export type NavItem = { href: string; label: string; icon: NavIconKey }

/**
 * Die Tab-Leiste hat höchstens fünf Ziele. Welche das sind, hängt davon ab,
 * wo ihr gerade steht: Solange nur eine Schwangerschaft läuft, ist die
 * SSW-Ansicht wichtiger als Auswertungen ohne Daten. Der Eltern-Tab ist immer
 * dabei – er kostet zehn Sekunden am Tag und nur dann, wenn er nah liegt.
 */
export function navItemsFor({
  hasChild,
  hasPregnancy,
}: {
  hasChild: boolean
  hasPregnancy: boolean
}): NavItem[] {
  const home: NavItem = { href: DASHBOARD_PATH, label: 'Heute', icon: 'home' }
  const more: NavItem = { href: '/mehr', label: 'Mehr', icon: 'more' }
  const parents: NavItem = { href: '/eltern', label: 'Wir', icon: 'parents' }
  const pregnancy: NavItem = { href: '/schwangerschaft', label: 'SSW', icon: 'pregnancy' }

  if (!hasChild) {
    return hasPregnancy ? [home, pregnancy, parents, more] : [home, parents, more]
  }

  const items: NavItem[] = [
    home,
    { href: '/verlauf', label: 'Verlauf', icon: 'history' },
    parents,
    { href: '/entwicklung', label: 'Entwicklung', icon: 'development' },
    more,
  ]
  // Laeuft parallel noch eine Schwangerschaft (Geschwisterkind), verdraengt sie
  // die Entwicklungsseite – die ist einen Tap weiter unter "Mehr".
  if (hasPregnancy) items.splice(3, 1, pregnancy)
  return items
}
