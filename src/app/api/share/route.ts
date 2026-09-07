import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth/session'
import { ACTIVE_CHILD_COOKIE } from '@/lib/household'
import { storeImage } from '@/lib/media/storage'
import { transcodeToOpus } from '@/lib/audio/transcode'
import { MAX_UPLOAD_BYTES, titelVorschlag } from '@/lib/audio/notes'
import { publish } from '@/lib/realtime'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Ziel des Share Target aus dem Manifest.
 *
 * Der Browser schickt die geteilten Dateien als multipart/form-data hierher.
 * Bilder wandern ins Tagebuch und haengen dort schon am neuen Eintrag,
 * Tonaufnahmen laufen durch dieselbe Opus-Umwandlung wie das Tonspur-Tagebuch.
 *
 * Am Ende steht immer ein Redirect – der Nutzer soll in der App landen und
 * nicht auf einer JSON-Antwort.
 */
function weiterZu(pfad: string): Response {
  // Bewusst ein relativer Location-Header statt Response.redirect(): das
  // braeuchte eine absolute URL, und die waere hinter dem Tunnel die interne
  // Adresse des Containers – der Browser landet dann im Nichts.
  return new Response(null, { status: 303, headers: { Location: pfad, 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request): Promise<Response> {
  const user = await getCurrentUser()
  // Nicht angemeldet: erst anmelden, danach steht das Tagebuch offen. Die
  // Datei ist dann weg – besser als sie ungeprueft irgendwo abzulegen.
  if (!user) return weiterZu('/login?weiter=/tagebuch')

  const store = await cookies()
  const gewuenscht = store.get(ACTIVE_CHILD_COOKIE)?.value
  const child =
    (gewuenscht
      ? await prisma.child.findFirst({
          where: { id: gewuenscht, householdId: user.householdId, archived: false },
          select: { id: true },
        })
      : null) ??
    (await prisma.child.findFirst({
      where: { householdId: user.householdId, archived: false },
      orderBy: [{ birthDate: 'asc' }, { createdAt: 'asc' }],
      select: { id: true },
    }))
  if (!child) return weiterZu('/onboarding')

  const form = await request.formData()
  const dateien = form.getAll('media').filter((eintrag): eintrag is File => eintrag instanceof File)
  if (dateien.length === 0) return weiterZu('/tagebuch')

  const titel = String(form.get('title') ?? '').trim().slice(0, 120)
  const bilder = dateien.filter((datei) => datei.type.startsWith('image/'))
  const toene = dateien.filter((datei) => datei.type.startsWith('audio/'))

  // ---------------------------------------------------------------- Toene --
  let toeneAngelegt = 0
  for (const datei of toene) {
    if (datei.size > MAX_UPLOAD_BYTES) continue
    const umgewandelt = await transcodeToOpus(datei, child.id)
    if (!umgewandelt.ok) continue

    const jetzt = new Date()
    await prisma.audioNote.create({
      data: {
        childId: child.id,
        title: titel || datei.name.replace(/\.[a-z0-9]{1,5}$/i, '') || titelVorschlag(jetzt),
        recordedAt: jetzt,
        path: umgewandelt.path,
        mimeType: umgewandelt.mimeType,
        bytes: umgewandelt.bytes,
        durationSec: umgewandelt.durationSec,
        peaks: umgewandelt.peaks,
        createdById: user.id,
      },
    })
    toeneAngelegt += 1
  }

  // --------------------------------------------------------------- Bilder --
  const mediaIds: string[] = []
  for (const datei of bilder.slice(0, 12)) {
    const gespeichert = await storeImage(datei, child.id)
    if (!gespeichert.ok) continue

    // EXIF ist nach storeImage weg; das Aufnahmedatum steht vorher fest und
    // dient als Vorschlag fuer das Datum des Eintrags.
    const asset = await prisma.mediaAsset.create({
      data: {
        childId: child.id,
        kind: 'image',
        path: gespeichert.image.path,
        thumbPath: gespeichert.image.thumbPath,
        width: gespeichert.image.width,
        height: gespeichert.image.height,
        bytes: gespeichert.image.bytes,
        mimeType: gespeichert.image.mimeType,
        takenAt: gespeichert.image.takenAt,
        createdById: user.id,
      },
    })
    mediaIds.push(asset.id)
  }

  if (mediaIds.length > 0 || toeneAngelegt > 0) {
    await publish({
      channel: mediaIds.length > 0 ? 'media' : 'audio',
      householdId: user.householdId,
      childId: child.id,
      kind: 'share',
    })
  }

  if (mediaIds.length > 0) {
    const params = new URLSearchParams({ geteilt: mediaIds.join(',') })
    if (titel) params.set('titel', titel)
    return weiterZu(`/tagebuch?${params.toString()}`)
  }
  if (toeneAngelegt > 0) return weiterZu('/tagebuch/toene')

  return weiterZu('/tagebuch')
}
