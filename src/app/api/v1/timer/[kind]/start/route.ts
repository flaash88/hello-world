import { startTimer } from '@/lib/events/service'
import { EVENT_CATEGORIES, isEventType, type EventType } from '@/lib/events/types'
import { apiAntwort } from '@/lib/api/auth'
import { mitApi } from '@/lib/api/handler'
import { sendeWebhooks } from '@/lib/api/webhooks'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** Timer starten: POST /api/v1/timer/sleep/start */
export async function POST(
  request: Request,
  context: { params: Promise<{ kind: string }> },
): Promise<Response> {
  const { kind } = await context.params

  return mitApi(request, async (ctx) => {
    if (!isEventType(kind) || !EVENT_CATEGORIES[kind as EventType].timed) {
      return apiAntwort(
        {
          error: `Für "${kind}" gibt es keinen Timer.`,
          erlaubt: Object.values(EVENT_CATEGORIES)
            .filter((kategorie) => kategorie.timed)
            .map((kategorie) => kategorie.type),
        },
        { status: 400 },
      )
    }

    const result = await startTimer(
      { userId: ctx.userId, householdId: ctx.householdId },
      ctx.childId,
      kind as EventType,
      {},
      undefined,
      'automation',
    )
    // "Laeuft bereits" ist kein Serverfehler, sondern eine Aussage ueber den
    // Zustand – 409 sagt das genauer als 400.
    if (!result.ok) return apiAntwort({ error: result.error }, { status: 409 })

    await sendeWebhooks(ctx.householdId, {
      art: 'timer.started',
      type: kind,
      eventId: result.data.id,
      childId: ctx.childId,
      at: new Date().toISOString(),
      quelle: 'Automation',
    })

    return apiAntwort({ id: result.data.id, type: kind, laeuft: true }, { status: 201 })
  })
}
