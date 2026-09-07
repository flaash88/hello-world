import { getCurrentUser } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { formatDateLong, formatDateTime, formatTime } from '@/lib/time'
import { unitPrefsFrom } from '@/lib/units'
import { druckDateiname } from '@/lib/print/kopf'
import { pdfAntwort } from '@/lib/print/antwort'
import { MESSORT_LABEL } from '@/lib/fever/episode'
import { dosis, grad, tagText } from '@/lib/fever/format'
import { ladeFieberDaten } from '@/lib/fever/daten'
import { buildFieberPdf } from '@/lib/fever/pdf'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** Zettel für die Ordination als PDF: /api/fieber/pdf?kind=… */
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
  const daten = await ladeFieberDaten({
    child,
    timezone: tz,
    units: unitPrefsFrom(household.settings),
    now,
  })
  // Ohne laufende Episode gibt es keinen Zettel – und keine leere Seite, die
  // so tut, als gaebe es einen.
  if (!daten) return new Response('Gerade kein Fieber eingetragen', { status: 404 })

  const beginn = new Date(daten.beginn)
  const hoechste = daten.hoechste

  const bytes = await buildFieberPdf({
    kopf: daten.kopf,
    beginnText: `${formatDateLong(beginn, tz)}, ${formatTime(beginn, tz)}`,
    hoechsteText: hoechste
      ? `${grad(hoechste.temperatureC)} am ${formatDateLong(new Date(hoechste.at), tz)} um ${formatTime(new Date(hoechste.at), tz)}${
          hoechste.ort ? ` (${MESSORT_LABEL[hoechste.ort]})` : ''
        }`
      : '—',
    tagText: tagText(daten.tag),
    messungen: daten.messungen.map((m) => ({
      zeit: formatDateTime(new Date(m.at), tz),
      temperatur: grad(m.temperatureC),
      ort: m.ort ? MESSORT_LABEL[m.ort] : '—',
      notiz: m.note ?? '',
    })),
    gaben: daten.gaben.map((g) => ({
      zeit: formatDateTime(new Date(g.at), tz),
      mittel: g.mittel,
      dosis: dosis(g) || '—',
      notiz: g.note ?? '',
    })),
    symptome: daten.symptome.map((s) => ({
      zeit: formatDateTime(new Date(s.at), tz),
      text: s.text,
    })),
  })

  return pdfAntwort(bytes, druckDateiname('fieberverlauf', child.name, now, tz))
}
