import type { Metadata } from 'next'
import { getAppContext } from '@/lib/household'
import { BackLink } from '@/components/layout/back-link'
import { NightModeSettings } from './night-mode-settings'

export const metadata: Metadata = { title: 'Nachtmodus' }

export default async function NightModePage() {
  const ctx = await getAppContext()
  const settings = ctx.household.settings
  return (
    <div className="flex flex-col gap-4">
      <BackLink href="/mehr" label="Mehr" />
      <h1 className="font-display text-2xl font-bold">Nachtmodus & Anzeige</h1>
      <NightModeSettings
        auto={settings?.nightModeAuto ?? true}
        start={settings?.nightModeStart ?? '20:00'}
        end={settings?.nightModeEnd ?? '06:00'}
      />
    </div>
  )
}
