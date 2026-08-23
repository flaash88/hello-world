import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth/session'
import { etagFor, readStoredFile } from '@/lib/media/storage'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Liefert hochgeladene Dateien aus: Bilder und eigene Einschlafgeräusche. Nur
 * für angemeldete Mitglieder des Haushalts, dem die Datei gehört – sie liegen
 * bewusst nicht im öffentlichen `public`-Verzeichnis.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  const user = await getCurrentUser()
  if (!user) return new Response('Nicht angemeldet', { status: 401 })

  const { path: segments } = await context.params
  const relativePath = segments.join('/')

  // Der Pfad muss zu einem Medium oder Klang des eigenen Haushalts gehören.
  const [image, sound] = await Promise.all([
    prisma.mediaAsset.findFirst({
      where: {
        child: { householdId: user.householdId },
        OR: [{ path: relativePath }, { thumbPath: relativePath }],
      },
      select: { bytes: true, mimeType: true },
    }),
    prisma.customSound.findFirst({
      where: { householdId: user.householdId, path: relativePath },
      select: { bytes: true, mimeType: true },
    }),
  ])
  const asset = image ?? sound
  if (!asset) return new Response('Nicht gefunden', { status: 404 })

  const etag = etagFor(relativePath, asset.bytes)
  if (request.headers.get('if-none-match') === etag) {
    return new Response(null, { status: 304, headers: { ETag: etag } })
  }

  const data = await readStoredFile(relativePath)
  if (!data) return new Response('Nicht gefunden', { status: 404 })

  return new Response(new Uint8Array(data), {
    headers: {
      'Content-Type': asset.mimeType,
      'Content-Length': String(data.byteLength),
      ETag: etag,
      // Dateien ändern sich nie – aber privat, nicht in Zwischen-Caches.
      'Cache-Control': 'private, max-age=31536000, immutable',
    },
  })
}
