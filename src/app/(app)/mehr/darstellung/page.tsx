import type { Metadata } from 'next'
import { getAppContext } from '@/lib/household'
import { START_SCREEN_OPTIONS, parseQuickActions, parseStartScreen } from '@/lib/settings/display'
import { routeErlaubt } from '@/lib/settings/features'
import { currentFeatures } from '@/lib/settings/features-server'
import { unitPrefsFrom } from '@/lib/units'
import { BackLink } from '@/components/layout/back-link'
import { DisplaySettings } from './display-settings'

export const metadata: Metadata = { title: 'Anzeige' }

export default async function DisplaySettingsPage() {
  const ctx = await getAppContext()
  const settings = ctx.household.settings
  const features = await currentFeatures()
  // Abgeschaltete Seiten stehen nicht als ausgegraute Zeile zur Wahl.
  const startScreens = START_SCREEN_OPTIONS.filter((option) =>
    routeErlaubt(features, option.path),
  ).map((option) => option.value)

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
        startScreens={startScreens}
        quickActions={parseQuickActions(settings?.quickActions)}
        hasChild={ctx.children.length > 0}
        hasPregnancy={Boolean(ctx.pregnancy)}
      />
    </div>
  )
}
