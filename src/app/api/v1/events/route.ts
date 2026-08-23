import { z } from 'zod'
import { createEvent } from '@/lib/events/service'
import { API_FELDER, API_TYPES, windelArt, zielFor } from '@/lib/api/registry'
import { apiAntwort } from '@/lib/api/auth'
import { mitApi } from '@/lib/api/handler'
import { sendeWebhooks } from '@/lib/api/webhooks'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Ereignis anlegen.
 *
 * Minimalfall, so wie ihn ein NFC-Tag am Wickeltisch schickt:
 * `{ "type": "diaper", "wet": true, "soiled": false }`
 *
 * `at` ist optional (ISO 8601, Standard jetzt). Alles Weitere haengt am Typ
 * und wird mit demselben Zod-Schema geprueft wie ein Eintrag aus der App –
 * inklusive Duplikatspruefung.
 */
const basis = z.object({
  type: z.string().min(1),
  at: z.string().optional(),
  endedAt: z.string().nullable().optional(),
  note: z.string().max(1000).optional(),
})

export async function POST(request: Request): Promise<Response> {
  return mitApi(request, async (ctx) => {
    let roh: unknown
    try {
      roh = await request.json()
    } catch {
      return apiAntwort({ error: 'Body muss JSON sein.' }, { status: 400 })
    }

    const parsed = basis.safeParse(roh)
    if (!parsed.success) {
      return apiAntwort(
        { error: parsed.error.issues[0]?.message ?? 'Eingabe ungültig.' },
        { status: 400 },
      )
    }

    const ziel = zielFor(parsed.data.type)
    if (!ziel) {
      return apiAntwort(
        { error: `Unbekannter type "${parsed.data.type}".`, erlaubt: API_TYPES },
        { status: 400 },
      )
    }

    const eingabe = roh as Record<string, unknown>
    const { type: _type, at: _at, endedAt: _endedAt, note: _note, ...felder } = eingabe

    // Die Windel kommt als zwei Schaltern herein, intern ist es eine Art.
    const payload =
      ziel.type === 'diaper'
        ? { ...felder, kind: windelArt(felder as { wet?: boolean; soiled?: boolean }) }
        : 'kind' in ziel
          ? { ...felder, kind: ziel.kind }
          : felder

    const startedAt = parsed.data.at ? new Date(parsed.data.at) : new Date()
    if (Number.isNaN(startedAt.getTime())) {
      return apiAntwort({ error: '`at` ist kein gültiger Zeitpunkt.' }, { status: 400 })
    }

    const result = await createEvent(
      { userId: ctx.userId, householdId: ctx.householdId },
      {
        childId: ctx.childId,
        type: ziel.type,
        startedAt: startedAt.toISOString(),
        endedAt: parsed.data.endedAt ?? null,
        payload,
        note: parsed.data.note,
        source: 'automation',
      },
    )

    if (!result.ok) {
      return apiAntwort(
        { error: result.error, felder: API_FELDER[parsed.data.type] ?? [] },
        { status: 400 },
      )
    }

    await sendeWebhooks(ctx.householdId, {
      art: 'event.created',
      type: parsed.data.type,
      eventId: result.data.id,
      childId: ctx.childId,
      at: startedAt.toISOString(),
      quelle: 'Automation',
    })

    return apiAntwort(
      {
        id: result.data.id,
        type: parsed.data.type,
        at: startedAt.toISOString(),
        // Die Duplikatspruefung laeuft auch hier – die Automation soll wissen,
        // wenn jemand dasselbe gerade von Hand eingetragen hat.
        ...(result.data.duplikat ? { moeglichesDuplikat: result.data.duplikat.text } : {}),
      },
      { status: 201 },
    )
  })
}
