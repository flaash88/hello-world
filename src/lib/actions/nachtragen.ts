'use server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/auth/session'
import { assertChildInHousehold } from '@/lib/household'
import { createEvent } from '@/lib/events/service'
import { EVENT_TYPES } from '@/lib/events/types'
import { mengenVorschlag, haeufigsterWert, NACHTRAG_TYPEN } from '@/lib/tracker/nachtragen'

export type NachtragResult = { ok: true; angelegt: number } | { error: string }

const zeileSchema = z.object({
  type: z.enum(EVENT_TYPES),
  /** Zeitpunkt als ISO-String – die Umrechnung passiert im Browser. */
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime().nullable().optional(),
  payload: z.unknown().optional(),
  note: z.string().max(2000).optional(),
})

const nachtragSchema = z.object({
  childId: z.string().min(1),
  // Mehr als zwanzig Zeilen auf einmal traegt niemand nach; die Grenze
  // schuetzt vor einem versehentlich verdoppelten Absenden.
  zeilen: z.array(zeileSchema).min(1).max(20),
})

/**
 * Mehrere Einträge in einem Durchgang.
 *
 * Bewusst ohne Zwischenschritte: keine Bestätigung je Zeile, kein Assistent.
 * Wer nachts vier Dinge nachträgt, tippt sie untereinander und schickt sie
 * einmal ab.
 *
 * Nachgetragene Einträge sehen aus wie sofort erfasste – kein eigenes Feld,
 * keine Markierung. Sie gehen durch dieselbe Doppelerfassungs-Prüfung wie
 * jeder andere Eintrag; steht ein Hinweis an, kommt er wie gewohnt.
 */
export async function nachtragenAction(
  input: z.input<typeof nachtragSchema>,
): Promise<NachtragResult> {
  const user = await requireUser()
  const parsed = nachtragSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Eingabe ungültig.' }
  }
  await assertChildInHousehold(parsed.data.childId, user.householdId)

  let angelegt = 0
  for (const zeile of parsed.data.zeilen) {
    const result = await createEvent(
      { userId: user.id, householdId: user.householdId },
      {
        childId: parsed.data.childId,
        type: zeile.type,
        startedAt: zeile.startedAt,
        endedAt: zeile.endedAt ?? null,
        payload: zeile.payload,
        note: zeile.note,
      },
    )
    // Eine kaputte Zeile soll die anderen nicht mitnehmen – nachts ist ein
    // Teilerfolg mehr wert als eine Fehlermeldung ueber allem.
    if (result.ok) angelegt += 1
  }

  if (angelegt === 0) return { error: 'Keine der Zeilen ließ sich speichern.' }
  revalidatePath('/')
  revalidatePath('/verlauf')
  return { ok: true, angelegt }
}

export type Vorschlaege = {
  /** Flaschenmenge in ml, wenn die letzten drei gleich waren. */
  flascheMl: number | null
  /** Abgepumpte Menge in ml. */
  pumpenMl: number | null
  /** Seite beim Stillen. */
  stillSeite: string | null
  /** Art der letzten Windeln. */
  windelArt: string | null
}

/**
 * Ein-Tap-Vorschläge aus den letzten Einträgen. Nur wo es ein erkennbares
 * Muster gibt – sonst bleibt das Feld leer, statt zu raten.
 */
export async function ladeVorschlaegeAction(childId: string): Promise<Vorschlaege> {
  const user = await requireUser()
  await assertChildInHousehold(childId, user.householdId)

  const letzte = await prisma.event.findMany({
    where: { childId, deletedAt: null, type: { in: NACHTRAG_TYPEN } },
    orderBy: { startedAt: 'desc' },
    select: { type: true, payload: true },
    take: 60,
  })

  const nach = (type: string) =>
    letzte.filter((event) => event.type === type).map((event) => event.payload as Record<string, unknown> | null)

  return {
    flascheMl: mengenVorschlag(nach('bottle').map((p) => zahl(p?.amountMl))),
    pumpenMl: mengenVorschlag(nach('pumping').map((p) => zahl(p?.amountMl))),
    stillSeite: haeufigsterWert(
      nach('nursing')
        .map((p) => text(p?.side))
        .filter((wert): wert is string => wert !== null),
    ),
    windelArt: haeufigsterWert(
      nach('diaper')
        .map((p) => text(p?.kind))
        .filter((wert): wert is string => wert !== null),
    ),
  }
}

function zahl(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}
