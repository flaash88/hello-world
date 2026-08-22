import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

/** Healthcheck fuer Docker und den Tunnel. Prueft auch die DB-Verbindung. */
export async function GET(): Promise<Response> {
  try {
    await prisma.$queryRaw`SELECT 1`
    return Response.json({ status: 'ok', at: new Date().toISOString() })
  } catch {
    return Response.json({ status: 'degraded', reason: 'database' }, { status: 503 })
  }
}
