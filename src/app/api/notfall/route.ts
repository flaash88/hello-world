import { getCurrentUser } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { cookies } from 'next/headers'
import { ACTIVE_CHILD_COOKIE } from '@/lib/household'
import { ladeNotfallKarte } from '@/lib/emergency/load'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Die Notfallkarte als JSON. Der Browser spiegelt sie damit in IndexedDB und
 * kann die Seite ohne Netz vollstaendig aus dem lokalen Bestand zeichnen.
 */
export async function GET(): Promise<Response> {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Nicht angemeldet' }, { status: 401 })

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

  if (!child) return Response.json({ error: 'Kein Kind angelegt' }, { status: 404 })

  const karte = await ladeNotfallKarte(user.householdId, child.id)
  if (!karte) return Response.json({ error: 'Kind nicht gefunden' }, { status: 404 })

  return Response.json(karte, { headers: { 'Cache-Control': 'no-store' } })
}
