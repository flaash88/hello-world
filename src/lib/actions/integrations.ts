'use server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/auth/session'
import { hashToken } from '@/lib/auth/tokens'
import { neuerToken } from '@/lib/api/auth'
import { API_TYPES } from '@/lib/api/registry'

export type IntegrationResult<T = unknown> = ({ ok: true } & Partial<T>) | { error: string }

/**
 * Legt einen Token an und gibt ihn genau einmal im Klartext zurueck. In der DB
 * liegt nur der Hash – wer ihn verliert, legt einen neuen an.
 */
export async function createTokenAction(
  name: string,
): Promise<IntegrationResult<{ token: string }>> {
  const user = await requireUser()
  const parsed = z.string().trim().min(1, 'Bitte einen Namen eingeben.').max(60).safeParse(name)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Name fehlt.' }

  const token = neuerToken()
  await prisma.integrationToken.create({
    data: {
      householdId: user.householdId,
      userId: user.id,
      name: parsed.data,
      tokenHash: hashToken(token),
    },
  })

  revalidatePath('/mehr/integrationen')
  return { ok: true, token }
}

export async function revokeTokenAction(id: string): Promise<IntegrationResult> {
  const user = await requireUser()
  const updated = await prisma.integrationToken.updateMany({
    where: { id, householdId: user.householdId, revokedAt: null },
    data: { revokedAt: new Date() },
  })
  if (updated.count === 0) return { error: 'Token nicht gefunden.' }

  revalidatePath('/mehr/integrationen')
  return { ok: true }
}

const webhookSchema = z.object({
  id: z.string().min(1).optional(),
  url: z
    .string()
    .trim()
    .url('Bitte eine vollständige Adresse angeben, mit http:// oder https://.')
    .max(300),
  eventTypes: z.array(z.string()).max(API_TYPES.length).default([]),
  active: z.boolean().default(true),
})

export async function saveWebhookAction(
  input: z.input<typeof webhookSchema>,
): Promise<IntegrationResult> {
  const user = await requireUser()
  const parsed = webhookSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Eingabe ungültig.' }

  // Nur bekannte Ereignistypen – ein Filter auf einen Tippfehler waere still
  // und wuerde nie ausloesen.
  const unbekannt = parsed.data.eventTypes.filter((type) => !API_TYPES.includes(type))
  if (unbekannt.length > 0) {
    return { error: `Unbekannter Ereignistyp: ${unbekannt.join(', ')}` }
  }

  const data = {
    url: parsed.data.url,
    eventTypes: parsed.data.eventTypes,
    active: parsed.data.active,
    // Ein geaenderter Webhook faengt mit sauberer Weste an.
    lastError: null,
    failures: 0,
  }

  if (parsed.data.id) {
    const updated = await prisma.webhook.updateMany({
      where: { id: parsed.data.id, householdId: user.householdId },
      data,
    })
    if (updated.count === 0) return { error: 'Webhook nicht gefunden.' }
  } else {
    await prisma.webhook.create({ data: { ...data, householdId: user.householdId } })
  }

  revalidatePath('/mehr/integrationen')
  return { ok: true }
}

export async function deleteWebhookAction(id: string): Promise<IntegrationResult> {
  const user = await requireUser()
  const deleted = await prisma.webhook.deleteMany({
    where: { id, householdId: user.householdId },
  })
  if (deleted.count === 0) return { error: 'Webhook nicht gefunden.' }

  revalidatePath('/mehr/integrationen')
  return { ok: true }
}
