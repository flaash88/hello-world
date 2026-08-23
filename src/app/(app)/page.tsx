import { redirect } from 'next/navigation'
import { getAppContext } from '@/lib/household'
import { startScreenPath } from '@/lib/settings/display'

/**
 * Die Wurzel leitet nur auf den eingestellten Startbildschirm weiter. Dadurch
 * bleibt `start_url` im Manifest '/' – die installierte App landet trotzdem
 * dort, wo ihr sie haben wollt.
 */
export default async function RootPage() {
  const ctx = await getAppContext()
  redirect(
    startScreenPath(ctx.household.settings?.startScreen, {
      hasChild: ctx.children.length > 0,
      hasPregnancy: Boolean(ctx.pregnancy),
    }),
  )
}
