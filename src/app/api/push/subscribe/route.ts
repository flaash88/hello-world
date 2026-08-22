import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth/session'
import { assertCsrf, CsrfError } from '@/lib/auth/csrf'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

const subscribeSchema = z.object({
  endpoint: z.string().url().max(1000),
  keys: z.object({ p256dh: z.string().min(1).max(500), auth: z.string().min(1).max(500) }),
})

/** Ein Geraet fuer Web Push anmelden. Mehrfachaufruf aktualisiert nur. */
export async function POST(request: Request): Promise<Response> {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Nicht angemeldet' }, { status: 401 })

  try {
    await assertCsrf(request)
  } catch (error) {
    if (error instanceof CsrfError) return Response.json({ error: error.message }, { status: 403 })
    throw error
  }

  const parsed = subscribeSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: 'Ungültige Anfrage.' }, { status: 400 })

  await prisma.pushSubscription.upsert({
    where: { endpoint: parsed.data.endpoint },
    create: {
      userId: user.id,
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.keys.p256dh,
      auth: parsed.data.keys.auth,
      userAgent: request.headers.get('user-agent')?.slice(0, 255) ?? null,
    },
    update: {
      userId: user.id,
      p256dh: parsed.data.keys.p256dh,
      auth: parsed.data.keys.auth,
      lastOkAt: null,
    },
  })

  await prisma.notificationPreference.upsert({
    where: { userId: user.id },
    create: { userId: user.id },
    update: {},
  })

  return Response.json({ ok: true })
}

/** Abmelden – etwa wenn der Browser das Abo erneuert hat. */
export async function DELETE(request: Request): Promise<Response> {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Nicht angemeldet' }, { status: 401 })

  try {
    await assertCsrf(request)
  } catch (error) {
    if (error instanceof CsrfError) return Response.json({ error: error.message }, { status: 403 })
    throw error
  }

  const body = await request.json().catch(() => null)
  const endpoint = typeof body?.endpoint === 'string' ? body.endpoint : null
  if (!endpoint) return Response.json({ error: 'Ungültige Anfrage.' }, { status: 400 })

  await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: user.id } })
  return Response.json({ ok: true })
}
