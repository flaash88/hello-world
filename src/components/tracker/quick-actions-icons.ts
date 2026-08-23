import {
  Baby,
  Droplets,
  Frown,
  Milk,
  Moon,
  MoreHorizontal,
  Stethoscope,
  UtensilsCrossed,
  Wind,
  type LucideIcon,
} from 'lucide-react'
import type { EventType } from '@/lib/events/types'

/** Symbol je Eintragsart – gemeinsam genutzt von Server- und Client-Teilen. */
export const QUICK_ACTION_ICONS: Record<EventType, LucideIcon> = {
  sleep: Moon,
  nursing: Baby,
  bottle: Milk,
  pumping: Wind,
  solids: UtensilsCrossed,
  diaper: Droplets,
  mood: Frown,
  health: Stethoscope,
  other: MoreHorizontal,
}
