import type { Metadata } from 'next'
import { PrintButton } from '@/components/print/print-button'
import { getAppContext } from '@/lib/household'
import { prisma } from '@/lib/db'
import { formatDateShort } from '@/lib/time'
import { ablaufAm, type Portion } from '@/lib/milk/portions'
import { LAGERORT_LABEL, haltbarkeitenAusSettings } from '@/lib/milk/storage'
import {
  ETIKETTEN_PRO_BOGEN,
  ETIKETT_BREITE_MM,
  ETIKETT_HOEHE_MM,
  qrSvg,
} from '@/lib/milk/labels'
import { BackLink } from '@/components/layout/back-link'
import { EmptyState } from '@/components/ui/empty-state'
import { QrCode } from 'lucide-react'

export const metadata: Metadata = { title: 'Etiketten' }

/**
 * Etikettenbogen: 70 × 37 mm, drei nebeneinander, acht untereinander – genau
 * 24 auf A4. Die Masse stehen in Millimetern im Stil, damit der Ausdruck
 * unabhaengig von der Bildschirmgroesse stimmt.
 */
export default async function EtikettenPage() {
  const ctx = await getAppContext()
  const haltbarkeiten = haltbarkeitenAusSettings(ctx.household.settings)
  const tz = ctx.timezone

  const rows = await prisma.milkPortion.findMany({
    where: { householdId: ctx.household.id, status: 'vorraetig' },
    orderBy: { abgepumptAm: 'asc' },
    take: ETIKETTEN_PRO_BOGEN,
  })

  if (rows.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <BackLink href="/vorrat" label="Milchvorrat" />
        <EmptyState
          icon={QrCode}
          title="Nichts zu beschriften"
          description="Etiketten gibt es für alles, was gerade im Vorrat liegt."
        />
      </div>
    )
  }

  const etiketten = await Promise.all(
    rows.map(async (row) => {
      const portion = row as Portion
      return {
        id: portion.id,
        mengeMl: portion.mengeMl,
        behaelter: portion.behaelter,
        abgepumpt: formatDateShort(portion.abgepumptAm, tz),
        ablauf: formatDateShort(ablaufAm(portion, haltbarkeiten), tz),
        lagerort:
          LAGERORT_LABEL[portion.lagerort as keyof typeof LAGERORT_LABEL] ?? portion.lagerort,
        qr: await qrSvg(portion.id),
      }
    }),
  )

  const ohneQr = etiketten.some((etikett) => etikett.qr === null)

  return (
    <div className="flex flex-col gap-4">
      <div className="print:hidden">
        <BackLink href="/vorrat" label="Milchvorrat" />
      </div>

      <div className="flex items-start justify-between gap-2 print:hidden">
        <div>
          <h1 className="font-display text-2xl font-bold">Etiketten</h1>
          <p className="text-muted-foreground">
            {etiketten.length} von {ETIKETTEN_PRO_BOGEN} auf einem A4-Bogen ·{' '}
            {ETIKETT_BREITE_MM} × {ETIKETT_HOEHE_MM} mm
          </p>
        </div>
        <PrintButton label="Etiketten drucken" />
      </div>

      {ohneQr && (
        <p className="text-sm text-muted-foreground print:hidden">
          Ohne gesetzte <code>APP_URL</code> steht auf dem Etikett kein QR-Code – ein Link ins
          Nichts hilft niemandem. Trag die öffentliche Adresse der App in die Umgebung ein, dann
          führt der Code direkt zur Portion.
        </p>
      )}

      <div
        className="grid gap-0 bg-white text-black"
        style={{ gridTemplateColumns: `repeat(3, ${ETIKETT_BREITE_MM}mm)` }}
        data-testid="etikettenbogen"
      >
        {etiketten.map((etikett) => (
          <div
            key={etikett.id}
            className="flex items-center gap-2 overflow-hidden border border-dashed border-neutral-300 p-2 print:border-transparent"
            style={{ width: `${ETIKETT_BREITE_MM}mm`, height: `${ETIKETT_HOEHE_MM}mm` }}
          >
            <div className="min-w-0 flex-1">
              <p className="text-[13pt] font-bold leading-tight">{etikett.mengeMl} ml</p>
              <p className="text-[8pt] leading-tight">Abgepumpt {etikett.abgepumpt}</p>
              <p className="text-[8pt] leading-tight">Bis {etikett.ablauf}</p>
              <p className="truncate text-[8pt] leading-tight">
                {etikett.lagerort}
                {etikett.behaelter ? ` · ${etikett.behaelter}` : ''}
              </p>
            </div>
            {etikett.qr && (
              <div
                className="shrink-0"
                style={{ width: '22mm', height: '22mm' }}
                aria-hidden
                dangerouslySetInnerHTML={{ __html: etikett.qr }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
