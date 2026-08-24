import { getCurrentUser } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { formatDateLong } from '@/lib/time'
import { unitPrefsFrom } from '@/lib/units'
import { druckDateiname, druckKopf } from '@/lib/print/kopf'
import { pdfAntwort } from '@/lib/print/antwort'
import { zustaende } from '@/lib/teeth/overview'
import { buildZaehnePdf, type ZahnZeile } from '@/lib/teeth/pdf'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const KIEFER_LABEL = { oben: 'oben', unten: 'unten' } as const
const SEITE_LABEL = { rechts: 'rechts', links: 'links' } as const

/** Zahnschema als PDF: /api/zaehne/pdf?kind=… */
export async function GET(request: Request): Promise<Response> {
  const user = await getCurrentUser()
  if (!user) return new Response('Nicht angemeldet', { status: 401 })

  const childId = new URL(request.url).searchParams.get('kind')

  const household = await prisma.household.findUniqueOrThrow({
    where: { id: user.householdId },
    select: { timezone: true, settings: true },
  })
  const tz = household.timezone

  const child = childId
    ? await prisma.child.findFirst({ where: { id: childId, householdId: user.householdId } })
    : await prisma.child.findFirst({ where: { householdId: user.householdId, archived: false } })
  if (!child) return new Response('Kein Kind gefunden', { status: 404 })

  const now = new Date()
  const eintraege = await prisma.tooth.findMany({ where: { childId: child.id } })
  const liste = zustaende(eintraege, child.birthDate, now, tz)

  const lage = (zustand: (typeof liste)[number]) =>
    `${KIEFER_LABEL[zustand.zahn.kiefer]} ${SEITE_LABEL[zustand.zahn.seite]}`

  // Nur was eingetragen ist: Eine Liste mit zwanzig leeren Zeilen liest sich
  // wie eine Mängelliste.
  const zeilen: ZahnZeile[] = liste
    .filter((zustand) => zustand.eruptedOn)
    .sort((a, b) => a.eruptedOn!.getTime() - b.eruptedOn!.getTime())
    .map((zustand) => ({
      name: zustand.zahn.name,
      lage: lage(zustand),
      durchbruch: formatDateLong(zustand.eruptedOn!, tz),
      lebensmonat: zustand.lebensmonat === null ? '' : `${zustand.lebensmonat}.`,
    }))

  const ausgefallen: ZahnZeile[] = liste
    .filter((zustand) => zustand.lostOn)
    .sort((a, b) => a.lostOn!.getTime() - b.lostOn!.getTime())
    .map((zustand) => ({
      name: zustand.zahn.name,
      lage: lage(zustand),
      durchbruch: formatDateLong(zustand.lostOn!, tz),
      lebensmonat: '',
    }))

  const bytes = await buildZaehnePdf({
    kopf: druckKopf('Zähne', {
      childName: child.name,
      birthDate: child.birthDate,
      timezone: tz,
      units: unitPrefsFrom(household.settings),
      now,
    }),
    zeilen,
    ausgefallen,
  })

  return pdfAntwort(bytes, druckDateiname('zaehne', child.name, now, tz))
}
