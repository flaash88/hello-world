import { prisma } from '@/lib/db'
import { stopTimer } from '@/lib/events/service'
import { isEventType } from '@/lib/events/types'
import { apiAntwort } from '@/lib/api/auth'
import { mitApi } from '@/lib/api/handler'
import { sendeWebhooks } from '@/lib/api/webhooks'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** Timer beenden: POST /api/v1/timer/sleep/stop */
export async function POST(
  request: Request,
  context: { params: Promise<{ kind: string }> },
): Promise<Response> {
  const { kind } = await context.params

  return mitApi(request, async (ctx) => {
    if (!isEventType(kind)) {
      return apiAntwort({ error: `Unbekannte Art "${kind}".` }, { status: 400 })
    }

    const laufend = await prisma.event.findFirst({
      where: { childId: ctx.childId, type: kind, running: true, deletedAt: null },
      select: { id: true },
    })
    if (!laufend) {
      return apiAntwort({ error: `Es läuft gerade kein ${kind}-Timer.` }, { status: 409 })
    }

    const result = await stopTimer(
      { userId: ctx.userId, householdId: ctx.householdId },
      laufend.id,
    )
    if (!result.ok) return apiAntwort({ error: result.error }, { status: 400 })

    await sendeWebhooks(ctx.householdId, {
      art: 'timer.stopped',
      type: kind,
      eventId: laufend.id,
      childId: ctx.childId,
      at: new Date().toISOString(),
      quelle: 'Automation',
    })

    return apiAntwort({ id: laufend.id, type: kind, laeuft: false })
  })
}
