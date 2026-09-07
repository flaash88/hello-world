import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getAppContext } from '@/lib/household'
import { DASHBOARD_PATH } from '@/lib/settings/display'
import { WillkommenText } from './willkommen-text'

export const metadata: Metadata = { title: 'Willkommen' }

/**
 * Die einzige Seite, die beim ersten Start von selbst erscheint. Sie erklaert
 * den Auslieferungszustand und sonst nichts: kein Rundgang, keine Vorschau auf
 * das, was noch kaeme. Wer mehr will, findet es in den Einstellungen.
 */
export default async function WillkommenPage() {
  const ctx = await getAppContext()
  // Wer sie schon gesehen hat, landet nicht noch einmal hier.
  if (ctx.household.introSeenAt) redirect(DASHBOARD_PATH)
  return <WillkommenText hasChild={ctx.children.length > 0 || Boolean(ctx.pregnancy)} />
}
