import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth/session'
import { assertCsrf, CsrfError } from '@/lib/auth/csrf'
import { deleteStoredFile } from '@/lib/media/storage'
import { publish } from '@/lib/realtime'
import { transcodeToOpus } from '@/lib/audio/transcode'
import { MAX_UPLOAD_BYTES, normalisiereTags, titelVorschlag } from '@/lib/audio/notes'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Nimmt eine Aufnahme oder eine hochgeladene Datei entgegen, wandelt sie nach
 * Opus um und legt die Tonspur an.
 *
 * `clientId` macht das Wiederholen aus der Offline-Queue ungefaehrlich: liegt
 * die Aufnahme schon, wird sie zurueckgegeben statt ein zweites Mal kodiert.
 */
export async function POST(request: Request): Promise<Response> {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Nicht angemeldet' }, { status: 401 })

  try {
    await assertCsrf(request)
  } catch (error) {
    if (error instanceof CsrfError) return Response.json({ error: error.message }, { status: 403 })
    throw error
  }

  const form = await request.formData()
  const childId = String(form.get('childId') ?? '')
  const child = await prisma.child.findFirst({
    where: { id: childId, householdId: user.householdId },
    select: { id: true },
  })
  if (!child) return Response.json({ error: 'Kind nicht gefunden.' }, { status: 404 })

  const clientId = String(form.get('clientId') ?? '') || null
  if (clientId) {
    const vorhanden = await prisma.audioNote.findUnique({ where: { clientId } })
    if (vorhanden) return Response.json({ id: vorhanden.id, duplicate: true })
  }

  const datei = form.get('file')
  if (!(datei instanceof File)) {
    return Response.json({ error: 'Keine Datei erhalten.' }, { status: 400 })
  }
  if (datei.size > MAX_UPLOAD_BYTES) {
    return Response.json(
      { error: `Die Datei ist größer als ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB.` },
      { status: 413 },
    )
  }

  const recordedAtRaw = String(form.get('recordedAt') ?? '')
  const recordedAt = recordedAtRaw ? new Date(recordedAtRaw) : new Date()
  if (Number.isNaN(recordedAt.getTime())) {
    return Response.json({ error: 'Zeitpunkt ist ungültig.' }, { status: 400 })
  }

  const result = await transcodeToOpus(datei, child.id)
  if (!result.ok) return Response.json({ error: result.error }, { status: 400 })

  const milestoneIdRaw = String(form.get('milestoneId') ?? '')
  let milestoneId: string | null = null
  if (milestoneIdRaw) {
    const meilenstein = await prisma.milestone.findFirst({
      where: { id: milestoneIdRaw, childId: child.id },
      select: { id: true },
    })
    if (!meilenstein) {
      await deleteStoredFile(result.path)
      return Response.json({ error: 'Meilenstein nicht gefunden.' }, { status: 404 })
    }
    milestoneId = meilenstein.id
  }

  let tags: string[] = []
  try {
    tags = normalisiereTags(JSON.parse(String(form.get('tags') ?? '[]')))
  } catch {
    tags = []
  }

  const titel = String(form.get('title') ?? '').trim().slice(0, 120)

  const note = await prisma.audioNote.create({
    data: {
      childId: child.id,
      title: titel || titelVorschlag(recordedAt),
      recordedAt,
      path: result.path,
      mimeType: result.mimeType,
      bytes: result.bytes,
      durationSec: result.durationSec,
      peaks: result.peaks,
      tags,
      milestoneId,
      clientId,
      createdById: user.id,
    },
  })

  await publish({
    channel: 'audio',
    householdId: user.householdId,
    childId: child.id,
    kind: 'create',
    id: note.id,
  })

  return Response.json({ id: note.id, durationSec: note.durationSec, bytes: note.bytes })
}
