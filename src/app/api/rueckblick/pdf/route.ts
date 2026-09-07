import sharp from 'sharp'
import { getCurrentUser } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { formatAge, formatDateLong } from '@/lib/time'
import { formatLength, formatWeight, unitPrefsFrom } from '@/lib/units'
import { dauerText } from '@/lib/audio/notes'
import { druckKopf } from '@/lib/print/kopf'
import { pdfAntwort } from '@/lib/print/antwort'
import { readStoredFile } from '@/lib/media/storage'
import { ladeRueckblick } from '@/lib/export/rueckblick'
import { rueckblickZahlen } from '@/lib/export/rueckblick-zahlen'
import { buildRueckblickPdf, type RueckblickFoto } from '@/lib/export/rueckblick-pdf'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** Breite, mit der ein Foto ins PDF wandert – mehr braucht ein Drittel A4 nicht. */
const FOTO_BREITE = 640

/** Jahresrückblick als PDF: /api/rueckblick/pdf?jahr=2026 */
export async function GET(request: Request): Promise<Response> {
  const user = await getCurrentUser()
  if (!user) return new Response('Nicht angemeldet', { status: 401 })

  const params = new URL(request.url).searchParams
  const jahr = Number(params.get('jahr')) || new Date().getFullYear()
  const childId = params.get('kind')

  const household = await prisma.household.findUniqueOrThrow({
    where: { id: user.householdId },
    select: { timezone: true, settings: true },
  })
  const tz = household.timezone
  const units = unitPrefsFrom(household.settings)

  const child = childId
    ? await prisma.child.findFirst({ where: { id: childId, householdId: user.householdId } })
    : await prisma.child.findFirst({ where: { householdId: user.householdId, archived: false } })
  if (!child) return new Response('Kein Kind gefunden', { status: 404 })

  const daten = await ladeRueckblick({ childId: child.id, jahr, timezone: tz })

  const kopf = druckKopf(`${child.name} · ${jahr}`, {
    childName: child.name,
    birthDate: child.birthDate,
    timezone: tz,
    units,
    now: new Date(Date.UTC(jahr, 11, 31)),
  })
  if (child.birthDate) {
    kopf.felder.push({
      label: 'Am Jahresende',
      wert: formatAge(child.birthDate, new Date(Date.UTC(jahr, 11, 31)), tz),
    })
  }

  const bytes = await buildRueckblickPdf({
    kopf,
    zahlen: rueckblickZahlen(daten, {
      gewicht: (kg) => formatWeight(kg, units),
      laenge: (cm) => formatLength(cm, units),
    }),
    meilensteine: daten.meilensteine.map((m) => ({
      titel: m.title,
      datum: m.achievedAt ? formatDateLong(m.achievedAt, tz) : '',
    })),
    toene: daten.toene.map((t) => ({
      titel: t.title,
      datum: `${formatDateLong(t.recordedAt, tz)} · ${dauerText(t.durationSec)}`,
    })),
    eintraege: await Promise.all(
      daten.eintraege.map(async (eintrag) => ({
        datum: formatDateLong(eintrag.happenedAt, tz),
        titel: eintrag.title,
        text: eintrag.body,
        fotos: await fotosAlsJpeg(eintrag.media.map((foto) => foto.thumbPath ?? foto.path)),
      })),
    ),
  })

  return pdfAntwort(bytes, `rueckblick-${jahr}.pdf`)
}

/**
 * Gespeichert wird WebP, einbetten kann `pdf-lib` nur JPEG und PNG – also wird
 * hier umkodiert. Ein Bild, das fehlt oder sich nicht lesen lässt, fällt still
 * weg: ein Rückblick ohne ein Foto ist besser als gar keiner.
 */
async function fotosAlsJpeg(pfade: string[]): Promise<RueckblickFoto[]> {
  const fotos: RueckblickFoto[] = []
  for (const pfad of pfade) {
    try {
      const roh = await readStoredFile(pfad)
      if (!roh) continue
      const jpeg = await sharp(roh)
        .resize({ width: FOTO_BREITE, withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer()
      fotos.push({ jpeg: new Uint8Array(jpeg) })
    } catch {
      // Unlesbares Bild – der Rest des Rückblicks steht trotzdem.
    }
  }
  return fotos
}
