import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth/session'
import { etagFor, readStoredFile } from '@/lib/media/storage'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Liefert hochgeladene Bilder aus. Nur für angemeldete Mitglieder des
 * Haushalts, dem das Bild gehört – die Dateien liegen bewusst nicht im
 * öffentlichen `public`-Verzeichnis.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  const user = await getCurrentUser()
  if (!user) return new Response('Nicht angemeldet', { status: 401 })

  const { path: segments } = await context.params
  const relativePath = segments.join('/')

  // Der Pfad muss zu einem Medium gehören, das dem eigenen Haushalt gehört.
  const asset = await prisma.mediaAsset.findFirst({
    where: {
      child: { householdId: user.householdId },
      OR: [{ path: relativePath }, { thumbPath: relativePath }],
    },
    select: { bytes: true, mimeType: true },
  })
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
      // Bilder ändern sich nie – aber privat, nicht in Zwischen-Caches.
      'Cache-Control': 'private, max-age=31536000, immutable',
    },
  })
}
