'use server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/auth/session'
import { parseHhMm } from '@/lib/time'
import { sendToUser } from '@/lib/push/send'

const prefsSchema = z.object({
  appointmentAlerts: z.boolean(),
  sleepWindowAlerts: z.boolean(),
  napLeadMinutes: z.number().int().min(0).max(120),
  medicationAlerts: z.boolean(),
  milkStockAlerts: z.boolean(),
  nightShiftAlerts: z.boolean(),
  quietFrom: z.string().nullable(),
  quietTo: z.string().nullable(),
  ntfyEnabled: z.boolean(),
})

export async function updateNotificationPrefsAction(
  input: z.input<typeof prefsSchema>,
): Promise<{ ok: true } | { error: string }> {
  const user = await requireUser()
  const parsed = prefsSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Eingabe ungültig.' }

  const { quietFrom, quietTo } = parsed.data
  if (quietFrom && parseHhMm(quietFrom) === null) return { error: 'Ruhezeit-Beginn ist ungültig.' }
  if (quietTo && parseHhMm(quietTo) === null) return { error: 'Ruhezeit-Ende ist ungültig.' }

  await prisma.notificationPreference.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...parsed.data },
    update: parsed.data,
  })
  revalidatePath('/mehr/benachrichtigungen')
  return { ok: true }
}

/**
 * Die Ruhezeit-Frage stellt sich einmal, beim ersten Einschalten irgendeiner
 * Benachrichtigung. Danach ist sie beantwortet – auch dann, wenn die Antwort
 * "keine Ruhezeit" war.
 */
export async function answerQuietHoursAction(
  input: { quietFrom: string | null; quietTo: string | null },
): Promise<{ ok: true } | { error: string }> {
  const user = await requireUser()
  const { quietFrom, quietTo } = input
  if (quietFrom && parseHhMm(quietFrom) === null) return { error: 'Ruhezeit-Beginn ist ungültig.' }
  if (quietTo && parseHhMm(quietTo) === null) return { error: 'Ruhezeit-Ende ist ungültig.' }
  // Halb ausgefuellt ergibt kein Fenster – dann lieber gar keins.
  const beide = quietFrom && quietTo ? { quietFrom, quietTo } : { quietFrom: null, quietTo: null }

  await prisma.notificationPreference.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...beide, quietAskedAt: new Date() },
    update: { ...beide, quietAskedAt: new Date() },
  })
  revalidatePath('/mehr/benachrichtigungen')
  return { ok: true }
}

const ntfySchema = z.object({
  ntfyServerUrl: z.string().trim().max(300).nullable(),
  ntfyTopic: z.string().trim().max(120).nullable(),
})

export async function updateNtfyAction(
  input: z.input<typeof ntfySchema>,
): Promise<{ ok: true } | { error: string }> {
  const user = await requireUser()
  const parsed = ntfySchema.safeParse(input)
  if (!parsed.success) return { error: 'Eingabe ungültig.' }

  const url = parsed.data.ntfyServerUrl?.trim() || null
  if (url && !/^https?:\/\//.test(url)) {
    return { error: 'Die Server-URL muss mit http:// oder https:// beginnen.' }
  }

  await prisma.householdSettings.upsert({
    where: { householdId: user.householdId },
    create: { householdId: user.householdId, ntfyServerUrl: url, ntfyTopic: parsed.data.ntfyTopic || null },
    update: { ntfyServerUrl: url, ntfyTopic: parsed.data.ntfyTopic || null },
  })
  revalidatePath('/mehr/benachrichtigungen')
  return { ok: true }
}

/** Probenachricht an das eigene Geraet – der einzige verlaessliche Test. */
export async function sendTestNotificationAction(): Promise<{ ok: true; sent: number } | { error: string }> {
  const user = await requireUser()
  const result = await sendToUser(
    user.id,
    {
      title: 'Sprössling meldet sich',
      body: 'Wenn du das liest, funktionieren die Benachrichtigungen.',
      url: '/mehr/benachrichtigungen',
      tag: 'test',
    },
    'system',
  )
  if (result.sent === 0) {
    const reason = result.skipped.includes('vapid-fehlt')
      ? 'Am Server fehlen die VAPID-Schlüssel.'
      : result.skipped.includes('ruhezeit')
        ? 'Gerade gilt deine Ruhezeit – deshalb kam nichts an.'
        : 'Es ist kein Gerät angemeldet.'
    return { error: reason }
  }
  return { ok: true, sent: result.sent }
}
