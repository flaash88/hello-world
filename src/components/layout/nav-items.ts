import { Home, Settings2, type LucideIcon } from 'lucide-react'

export type NavItem = { href: string; label: string; icon: LucideIcon }

/** Reihenfolge der Tab-Leiste. Daumen-Reichweite: Wichtiges liegt links. */
export const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Heute', icon: Home },
  { href: '/mehr', label: 'Mehr', icon: Settings2 },
]
