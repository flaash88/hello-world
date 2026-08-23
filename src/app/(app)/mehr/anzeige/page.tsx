import type { Metadata } from 'next'
import { getAppContext } from '@/lib/household'
import { currentFeatures } from '@/lib/settings/features-server'
import { FEATURE_KEYS, schalterStand } from '@/lib/settings/features'
import { BackLink } from '@/components/layout/back-link'
import { AnzeigeEinstellungen } from './anzeige-einstellungen'

export const metadata: Metadata = { title: 'Was die App anzeigt' }

export default async function AnzeigePage() {
  await getAppContext()
  const state = await currentFeatures()

  return (
    <div className="flex flex-col gap-4">
      <BackLink href="/mehr" label="Mehr" />
      <h1 className="font-display text-2xl font-bold">Was die App anzeigt</h1>
      <AnzeigeEinstellungen
        level={state.level}
        schalter={Object.fromEntries(
          FEATURE_KEYS.map((key) => [key, schalterStand(state, key)]),
        )}
        pauseBis={state.pauseBis?.toISOString() ?? null}
      />
    </div>
  )
}
