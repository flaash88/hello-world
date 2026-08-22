/**
 * Nur serialisierbare Werte: Die Tab-Leiste ist eine Client-Komponente und
 * bekommt ihre Ziele vom Server. Symbole werden dort anhand des Schlüssels
 * zugeordnet.
 */
export type NavIconKey = 'home' | 'history' | 'development' | 'stats' | 'pregnancy' | 'more'
export type NavItem = { href: string; label: string; icon: NavIconKey }

/**
 * Die Tab-Leiste hat höchstens fünf Ziele. Welche das sind, hängt davon ab,
 * wo ihr gerade steht: Solange nur eine Schwangerschaft läuft, ist die
 * SSW-Ansicht wichtiger als Auswertungen ohne Daten.
 */
export function navItemsFor({
  hasChild,
  hasPregnancy,
}: {
  hasChild: boolean
  hasPregnancy: boolean
}): NavItem[] {
  const home: NavItem = { href: '/', label: 'Heute', icon: 'home' }
  const more: NavItem = { href: '/mehr', label: 'Mehr', icon: 'more' }
  const pregnancy: NavItem = { href: '/schwangerschaft', label: 'SSW', icon: 'pregnancy' }

  if (!hasChild) {
    return hasPregnancy ? [home, pregnancy, more] : [home, more]
  }

  const items: NavItem[] = [
    home,
    { href: '/verlauf', label: 'Verlauf', icon: 'history' },
    { href: '/entwicklung', label: 'Entwicklung', icon: 'development' },
    { href: '/auswertung', label: 'Auswertung', icon: 'stats' },
    more,
  ]
  // Läuft parallel noch eine Schwangerschaft (Geschwisterkind), verdrängt sie
  // die Auswertung – die ist einen Tap weiter unter "Mehr" erreichbar.
  if (hasPregnancy) items.splice(3, 1, pregnancy)
  return items
}
