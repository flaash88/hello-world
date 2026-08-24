import type { Metadata } from 'next'
import type { LucideIcon } from 'lucide-react'
import Link from 'next/link'
import {
  Baby,
  BellRing,
  ChevronRight,
  Download,
  HardDriveDownload,
  KeyRound,
  Moon,
  ShieldAlert,
  SlidersHorizontal,
  SquareDashedBottom,
  UserPlus,
} from 'lucide-react'
import { getAppContext } from '@/lib/household'
import { EINSTELLUNGEN, type EinstellungIconKey } from '@/lib/settings/menu'
import { BackLink } from '@/components/layout/back-link'

export const metadata: Metadata = { title: 'Einstellungen' }

const ICONS: Record<EinstellungIconKey, LucideIcon> = {
  kind: Baby,
  notfalldaten: ShieldAlert,
  einladung: UserPlus,
  anzeige: SquareDashedBottom,
  benachrichtigungen: BellRing,
  nachtmodus: Moon,
  einheiten: SlidersHorizontal,
  export: Download,
  backup: HardDriveDownload,
  automationen: KeyRound,
}

/**
 * Alle Einstellungen an einer Stelle, in drei Gruppen. Vorher lagen sie offen
 * unter „Mehr" und haben die Bereiche zugeschuettet, die man taeglich braucht.
 *
 * Die Zeilen sind bewusst nicht nach Feature-Schaltern gefiltert: eine
 * Einstellung, die man nicht findet, weil der Bereich gerade aus ist, waere
 * eine Falle – gerade „Was die App anzeigt" muss immer erreichbar sein.
 */
export default async function EinstellungenPage() {
  await getAppContext()

  return (
    <div className="flex flex-col gap-4">
      <BackLink href="/mehr" label="Mehr" />
      <h1 className="font-display text-2xl font-bold">Einstellungen</h1>

      {EINSTELLUNGEN.map((gruppe) => (
        <nav key={gruppe.titel} aria-label={gruppe.titel}>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
            {gruppe.titel}
          </h2>
          <ul className="flex flex-col gap-2">
            {gruppe.links.map(({ href, label, hinweis, icon }) => {
              const Icon = ICONS[icon]
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className="flex min-h-16 items-center gap-3 rounded-xl border border-border bg-card px-4"
                  >
                    <Icon className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{label}</span>
                      <span className="block text-xs text-muted-foreground">{hinweis}</span>
                    </span>
                    <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      ))}
      <div className="pb-4" />
    </div>
  )
}
