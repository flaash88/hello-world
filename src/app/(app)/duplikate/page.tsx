import type { Metadata } from 'next'
import { Baby, Check } from 'lucide-react'
import { getAppContext } from '@/lib/household'
import { currentFeatures } from '@/lib/settings/features-server'
import { ladeOffeneVerdachtsfaelle } from '@/lib/events/duplicate-service'
import { eventDetail, eventTitle } from '@/lib/events/format'
import { formatDateShort, formatTime } from '@/lib/time'
import { unitPrefsFrom } from '@/lib/units'
import { BackLink } from '@/components/layout/back-link'
import { EmptyState } from '@/components/ui/empty-state'
import { DuplikatListe, type VerdachtView } from './duplikat-liste'

export const metadata: Metadata = { title: 'Doppelte Einträge' }

export default async function DuplikatePage() {
  const ctx = await getAppContext()
  const child = ctx.activeChild

  if (!child) {
    return (
      <EmptyState
        icon={Baby}
        title="Noch kein Kind angelegt"
        description="Doppelte Einträge entstehen erst, wenn ihr beide etwas eintragt."
      />
    )
  }

  const features = await currentFeatures()
  const schlaf = features.aktiv.has('schlafanalyse')
  // Der Weg zurueck haengt daran, woher man kam: ohne Auswertung gibt es sie
  // nicht, dann fuehrt der Link ins Menue.
  const zurueck = features.aktiv.has('auswertung')
    ? { href: '/auswertung', label: 'Auswertung' }
    : { href: '/mehr', label: 'Mehr' }
  const tz = ctx.timezone
  const units = unitPrefsFrom(ctx.household.settings)
  const verdachte = await ladeOffeneVerdachtsfaelle(child.id)

  const view: VerdachtView[] = verdachte.map((verdacht) => ({
    id: verdacht.id,
    eintraege: verdacht.eintraege.map((eintrag) => ({
      id: eintrag.id,
      titel: eventTitle(eintrag),
      detail: eventDetail(eintrag, units) ?? eintrag.note ?? '',
      zeit: `${formatDateShort(eintrag.startedAt, tz)}, ${formatTime(eintrag.startedAt, tz)}`,
      wer: eintrag.createdByName,
      istMeiner: eintrag.createdById === ctx.user.id,
    })),
  }))

  return (
    <div className="flex flex-col gap-4">
      <BackLink href={zurueck.href} label={zurueck.label} />
      <div>
        <h1 className="font-display text-2xl font-bold">Doppelte Einträge</h1>
        <p className="text-muted-foreground">
          Hier steht, wo ihr beide dasselbe eingetragen haben könntet.
          {schlaf && ' Offene Fälle zählen nicht in die Wachfenster-Berechnung mit.'}
        </p>
      </div>

      {view.length === 0 ? (
        <EmptyState
          icon={Check}
          title="Nichts offen"
          description="Kein Verdacht auf doppelte Einträge. Passt."
        />
      ) : (
        <DuplikatListe verdachte={view} />
      )}
    </div>
  )
}
