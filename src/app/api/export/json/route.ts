import { getCurrentUser } from '@/lib/auth/session'
import { buildBackup } from '@/lib/export/backup'
import { localDateKey } from '@/lib/time'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** Vollstaendiges JSON-Backup zum Herunterladen. */
export async function GET(request: Request): Promise<Response> {
  const user = await getCurrentUser()
  if (!user) return new Response('Nicht angemeldet', { status: 401 })

  const url = new URL(request.url)
  const includeOwnPrivate = url.searchParams.get('privat') === '1' ? user.id : undefined

  const backup = await buildBackup(user.householdId, { includeOwnPrivate })
  const filename = `sproessling-backup-${localDateKey(new Date())}.json`

  return new Response(JSON.stringify(backup, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
