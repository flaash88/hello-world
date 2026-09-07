import type { Metadata } from 'next'
import { getAppContext } from '@/lib/household'
import { ladeNotfallKarte } from '@/lib/emergency/load'
import { NotfallAnsicht } from './notfall-ansicht'

export const metadata: Metadata = { title: 'Notfallkarte' }

/**
 * Die Notfallkarte wird serverseitig gebaut und im Browser gespiegelt. Ohne
 * Netz zeichnet die Client-Komponente aus IndexedDB weiter – deshalb ist
 * `karte` hier optional.
 */
export default async function NotfallPage() {
  const ctx = await getAppContext()
  const child = ctx.activeChild

  const karte = child ? await ladeNotfallKarte(ctx.household.id, child.id) : null

  return <NotfallAnsicht childId={child?.id ?? null} karte={karte} />
}
