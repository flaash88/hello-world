import type { Metadata } from 'next'
import { Thermometer } from 'lucide-react'
import { getAppContext } from '@/lib/household'
import { unitPrefsFrom } from '@/lib/units'
import { EPISODE_FENSTER_STUNDEN, FIEBER_AB_C } from '@/lib/fever/episode'
import { ladeFieberDaten } from '@/lib/fever/daten'
import { EmptyState } from '@/components/ui/empty-state'
import { FieberAnsicht } from './fieber-ansicht'
import { TemperaturKnopf } from './temperatur-knopf'

export const metadata: Metadata = { title: 'Fieberverlauf' }

export default async function FieberPage() {
  const ctx = await getAppContext()
  const child = ctx.activeChild

  if (!child) {
    return (
      <EmptyState
        icon={Thermometer}
        title="Noch kein Kind angelegt"
        description="Der Fieberverlauf gehört zu einem Kind – leg zuerst eines an."
      />
    )
  }

  const daten = await ladeFieberDaten({
    child,
    timezone: ctx.timezone,
    units: unitPrefsFrom(ctx.household.settings),
  })

  if (!daten) {
    return (
      <div className="flex flex-col gap-4">
        <EmptyState
          icon={Thermometer}
          title="Gerade kein Fieber"
          description={`Diese Ansicht schaltet sich frei, sobald in den letzten ${EPISODE_FENSTER_STUNDEN} Stunden eine Temperatur über ${FIEBER_AB_C.toLocaleString('de-AT')} °C eingetragen wurde.`}
        />
        <TemperaturKnopf childId={child.id} />
      </div>
    )
  }

  return <FieberAnsicht daten={daten} />
}
