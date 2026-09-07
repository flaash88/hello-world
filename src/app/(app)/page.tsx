import { redirect } from 'next/navigation'
import { getAppContext } from '@/lib/household'
import { startScreenPath } from '@/lib/settings/display'
import { routeErlaubt } from '@/lib/settings/features'
import { currentFeatures } from '@/lib/settings/features-server'

/**
 * Die Wurzel leitet nur auf den eingestellten Startbildschirm weiter. Dadurch
 * bleibt `start_url` im Manifest '/' – die installierte App landet trotzdem
 * dort, wo ihr sie haben wollt.
 */
export default async function RootPage() {
  const ctx = await getAppContext()
  // Beim allerersten Start steht die Erklaerung zum Protokollmodus davor.
  if (!ctx.household.introSeenAt) redirect('/willkommen')

  const features = await currentFeatures()
  redirect(
    startScreenPath(ctx.household.settings?.startScreen, {
      hasChild: ctx.children.length > 0,
      hasPregnancy: Boolean(ctx.pregnancy),
      erlaubt: (pfad) => routeErlaubt(features, pfad),
    }),
  )
}
