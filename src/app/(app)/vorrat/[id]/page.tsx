import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getAppContext } from '@/lib/household'
import { prisma } from '@/lib/db'
import { formatDateShort } from '@/lib/time'
import { zustand, type Portion } from '@/lib/milk/portions'
import { LAGERORT_LABEL, haltbarkeitenAusSettings } from '@/lib/milk/storage'
import { BackLink } from '@/components/layout/back-link'
import { PortionDetail } from './portion-detail'

export const metadata: Metadata = { title: 'Portion' }

/**
 * Einzelne Portion – das Ziel des QR-Codes auf dem Etikett. Wer den Beutel in
 * der Hand hat, scannt und kann sofort abhaken.
 */
export default async function PortionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await getAppContext()

  const row = await prisma.milkPortion.findFirst({
    where: { id, householdId: ctx.household.id },
  })
  if (!row) notFound()

  const portion = row as Portion
  const haltbarkeiten = haltbarkeitenAusSettings(ctx.household.settings)
  const z = zustand(portion, haltbarkeiten, new Date(), ctx.timezone)

  return (
    <div className="flex flex-col gap-4">
      <BackLink href="/vorrat" label="Milchvorrat" />
      <PortionDetail
        id={portion.id}
        mengeMl={portion.mengeMl}
        lagerortLabel={
          LAGERORT_LABEL[portion.lagerort as keyof typeof LAGERORT_LABEL] ?? portion.lagerort
        }
        behaelter={portion.behaelter}
        notiz={portion.notiz}
        abgepumptText={formatDateShort(portion.abgepumptAm, ctx.timezone)}
        ablaufText={z.text}
        abgelaufen={z.abgelaufen}
        aufgetaut={z.aufgetaut}
        status={portion.status}
        gefroren={portion.lagerort !== 'kuehlschrank' && !z.aufgetaut}
      />
    </div>
  )
}
