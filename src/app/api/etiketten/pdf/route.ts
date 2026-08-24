import { getCurrentUser } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { formatDateShort } from '@/lib/time'
import { pdfAntwort } from '@/lib/print/antwort'
import { ablaufAm, type Portion } from '@/lib/milk/portions'
import { LAGERORT_LABEL, haltbarkeitenAusSettings } from '@/lib/milk/storage'
import { ETIKETTEN_PRO_BOGEN, qrRaster } from '@/lib/milk/labels'
import { buildEtikettenPdf, type EtikettPdf } from '@/lib/milk/etiketten-pdf'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** Etikettenbogen als PDF: /api/etiketten/pdf */
export async function GET(): Promise<Response> {
  const user = await getCurrentUser()
  if (!user) return new Response('Nicht angemeldet', { status: 401 })

  const household = await prisma.household.findUniqueOrThrow({
    where: { id: user.householdId },
    select: { timezone: true, settings: true },
  })
  const tz = household.timezone
  const haltbarkeiten = haltbarkeitenAusSettings(household.settings)

  const rows = await prisma.milkPortion.findMany({
    where: { householdId: user.householdId, status: 'vorraetig' },
    orderBy: { abgepumptAm: 'asc' },
    take: ETIKETTEN_PRO_BOGEN,
  })
  if (rows.length === 0) return new Response('Nichts im Vorrat zu beschriften', { status: 404 })

  const etiketten: EtikettPdf[] = await Promise.all(
    rows.map(async (row) => {
      const portion = row as Portion
      return {
        mengeText: `${portion.mengeMl} ml`,
        abgepumpt: formatDateShort(portion.abgepumptAm, tz),
        ablauf: formatDateShort(ablaufAm(portion, haltbarkeiten), tz),
        lagerort:
          (LAGERORT_LABEL[portion.lagerort as keyof typeof LAGERORT_LABEL] ?? portion.lagerort) +
          (portion.behaelter ? ` · ${portion.behaelter}` : ''),
        qr: await qrRaster(portion.id),
      }
    }),
  )

  return pdfAntwort(await buildEtikettenPdf(etiketten), 'etiketten.pdf')
}
