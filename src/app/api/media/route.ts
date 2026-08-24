import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth/session'
import { assertCsrf, CsrfError } from '@/lib/auth/csrf'
import { deleteStoredFile, storeImage } from '@/lib/media/storage'
import { publish } from '@/lib/realtime'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Ein vom Browser gemeldetes Aufnahmedatum. Wird geprueft wie jede Eingabe
 * von aussen: kein Datum vor 1990, keines aus der Zukunft.
 */
function aufnahmezeitAusFeld(value: FormDataEntryValue | null): Date | null {
  if (typeof value !== 'string' || !value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  if (date.getFullYear() < 1990) return null
  if (date.getTime() > Date.now() + 86_400_000) return null
  return date
}

/** Bild-Upload. Mehrere Dateien pro Anfrage sind erlaubt. */
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
  const journalEntryId = form.get('journalEntryId')
  // Der Browser verkleinert Bilder vor dem Upload und verliert dabei die
  // EXIF-Daten. Damit das Aufnahmedatum nicht verschwindet, liest er es vorher
  // selbst aus und schickt es mit. Was hier im Bild steht, hat Vorrang.
  const gemeldetesDatum = aufnahmezeitAusFeld(form.get('takenAt'))

  const child = await prisma.child.findFirst({
    where: { id: childId, householdId: user.householdId },
  })
  if (!child) return Response.json({ error: 'Kind nicht gefunden.' }, { status: 404 })

  const files = form.getAll('files').filter((entry): entry is File => entry instanceof File)
  if (files.length === 0) return Response.json({ error: 'Keine Datei erhalten.' }, { status: 400 })
  if (files.length > 12) return Response.json({ error: 'Höchstens zwölf Bilder auf einmal.' }, { status: 400 })

  const created: { id: string; path: string; thumbPath: string; takenAt: string | null }[] = []
  const failed: string[] = []

  for (const file of files) {
    const result = await storeImage(file, child.id)
    if (!result.ok) {
      failed.push(`${file.name}: ${result.error}`)
      continue
    }

    const asset = await prisma.mediaAsset.create({
      data: {
        childId: child.id,
        journalEntryId: typeof journalEntryId === 'string' && journalEntryId ? journalEntryId : null,
        kind: 'image',
        path: result.image.path,
        thumbPath: result.image.thumbPath,
        width: result.image.width,
        height: result.image.height,
        bytes: result.image.bytes,
        mimeType: result.image.mimeType,
        takenAt: result.image.takenAt ?? gemeldetesDatum,
        createdById: user.id,
      },
    })
    created.push({
      id: asset.id,
      path: asset.path,
      thumbPath: asset.thumbPath ?? asset.path,
      takenAt: asset.takenAt?.toISOString() ?? null,
    })
  }

  if (created.length > 0) {
    await publish({
      channel: 'media',
      householdId: user.householdId,
      childId: child.id,
      kind: 'upload',
    })
  }

  return Response.json({ created, failed })
}

const deleteSchema = z.object({ id: z.string().min(1) })

export async function DELETE(request: Request): Promise<Response> {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Nicht angemeldet' }, { status: 401 })

  try {
    await assertCsrf(request)
  } catch (error) {
    if (error instanceof CsrfError) return Response.json({ error: error.message }, { status: 403 })
    throw error
  }

  const parsed = deleteSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: 'Ungültige Anfrage.' }, { status: 400 })

  const asset = await prisma.mediaAsset.findFirst({
    where: { id: parsed.data.id, child: { householdId: user.householdId } },
  })
  if (!asset) return Response.json({ error: 'Bild nicht gefunden.' }, { status: 404 })

  await prisma.mediaAsset.delete({ where: { id: asset.id } })
  await deleteStoredFile(asset.path)
  if (asset.thumbPath) await deleteStoredFile(asset.thumbPath)

  await publish({ channel: 'media', householdId: user.householdId, kind: 'delete', id: asset.id })
  return Response.json({ ok: true })
}
