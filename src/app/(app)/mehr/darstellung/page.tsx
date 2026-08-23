import type { Metadata } from 'next'
import { getAppContext } from '@/lib/household'
import { parseQuickActions, parseStartScreen } from '@/lib/settings/display'
import { unitPrefsFrom } from '@/lib/units'
import { BackLink } from '@/components/layout/back-link'
import { DisplaySettings } from './display-settings'

export const metadata: Metadata = { title: 'Anzeige' }

export default async function DisplaySettingsPage() {
  const ctx = await getAppContext()
  const settings = ctx.household.settings

  return (
    <div className="flex flex-col gap-4">
      <BackLink href="/mehr" label="Mehr" />
      <h1 className="font-display text-2xl font-bold">Einheiten & Startbildschirm</h1>
      <p className="text-muted-foreground">
        Gilt für euch beide – ihr schaut ja auf dieselben Zahlen.
      </p>
      <DisplaySettings
        units={unitPrefsFrom(settings)}
        startScreen={parseStartScreen(settings?.startScreen)}
        quickActions={parseQuickActions(settings?.quickActions)}
        hasChild={ctx.children.length > 0}
        hasPregnancy={Boolean(ctx.pregnancy)}
      />
    </div>
  )
}
