import 'server-only'
import webpush from 'web-push'
import { prisma } from '@/lib/db'
import { isWithinWindow } from '@/lib/time'

export type PushMessage = {
  title: string
  body: string
  url?: string
  tag?: string
}

let configured = false

/** VAPID einmalig setzen. Ohne Schluessel bleibt Web Push stumm. */
function ensureConfigured(): boolean {
  if (configured) return true
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  if (!publicKey || !privateKey) return false

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? 'mailto:admin@example.org',
    publicKey,
    privateKey,
  )
  configured = true
  return true
}

export function pushConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY)
}

export type DeliveryResult = { sent: number; removed: number; skipped: string[] }

/**
 * Schickt eine Nachricht an alle Geraete eines Users – sofern die jeweilige
 * Kategorie eingeschaltet ist und gerade keine Ruhezeit gilt.
 */
export async function sendToUser(
  userId: string,
  message: PushMessage,
  category: 'nap' | 'feed' | 'medication' | 'appointment' | 'partner' | 'system' = 'system',
): Promise<DeliveryResult> {
  const result: DeliveryResult = { sent: 0, removed: 0, skipped: [] }

  const prefs = await prisma.notificationPreference.findUnique({ where: { userId } })
  if (prefs && !categoryEnabled(prefs, category)) {
    result.skipped.push('kategorie-aus')
    return result
  }
  if (prefs?.quietFrom && prefs.quietTo && isWithinWindow(new Date(), prefs.quietFrom, prefs.quietTo)) {
    result.skipped.push('ruhezeit')
    return result
  }

  // ntfy laeuft unabhaengig von Web Push – manchmal ist es der einzige Weg,
  // der durch den Tunnel kommt.
  if (prefs?.ntfyEnabled) {
    await sendNtfy(userId, message)
  }

  if (!ensureConfigured()) {
    result.skipped.push('vapid-fehlt')
    return result
  }

  const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } })
  for (const subscription of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        },
        JSON.stringify(message),
        { TTL: 3600 },
      )
      await prisma.pushSubscription.update({
        where: { id: subscription.id },
        data: { lastOkAt: new Date() },
      })
      result.sent += 1
    } catch (error) {
      const statusCode = (error as { statusCode?: number }).statusCode
      // 404/410: Das Abo ist beim Push-Dienst weg – aufraeumen statt ewig retryen.
      if (statusCode === 404 || statusCode === 410) {
        await prisma.pushSubscription.delete({ where: { id: subscription.id } })
        result.removed += 1
      } else {
        result.skipped.push(`fehler-${statusCode ?? 'unbekannt'}`)
      }
    }
  }
  return result
}

function categoryEnabled(
  prefs: {
    napAlerts: boolean
    feedAlerts: boolean
    medicationAlerts: boolean
    appointmentAlerts: boolean
    partnerActivity: boolean
  },
  category: string,
): boolean {
  switch (category) {
    case 'nap':
      return prefs.napAlerts
    case 'feed':
      return prefs.feedAlerts
    case 'medication':
      return prefs.medicationAlerts
    case 'appointment':
      return prefs.appointmentAlerts
    case 'partner':
      return prefs.partnerActivity
    default:
      return true
  }
}

/**
 * Optionaler ntfy-Webhook. Server-URL und Topic stehen in den
 * Haushalts-Einstellungen; ohne Konfiguration passiert nichts.
 */
async function sendNtfy(userId: string, message: PushMessage): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { household: { select: { settings: true } } },
  })
  const settings = user?.household.settings
  if (!settings?.ntfyServerUrl || !settings.ntfyTopic) return

  const url = `${settings.ntfyServerUrl.replace(/\/+$/, '')}/${encodeURIComponent(settings.ntfyTopic)}`
  try {
    await fetch(url, {
      method: 'POST',
      headers: {
        Title: encodeHeader(message.title),
        Tags: 'baby_symbol',
        ...(message.url ? { Click: message.url } : {}),
      },
      body: message.body,
      signal: AbortSignal.timeout(5000),
    })
  } catch {
    // ntfy ist ein Zusatzweg – ein Fehler darf den Rest nicht aufhalten.
  }
}

/** HTTP-Header vertragen nur ASCII; Umlaute werden umschrieben. */
function encodeHeader(value: string): string {
  return value
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/Ä/g, 'Ae')
    .replace(/Ö/g, 'Oe')
    .replace(/Ü/g, 'Ue')
    .replace(/ß/g, 'ss')
    .replace(/[^\x00-\x7F]/g, '')
}

/** Alle Mitglieder eines Haushalts benachrichtigen, optional ohne Ausloeser. */
export async function sendToHousehold(
  householdId: string,
  message: PushMessage,
  category: Parameters<typeof sendToUser>[2] = 'system',
  exceptUserId?: string,
): Promise<DeliveryResult> {
  const users = await prisma.user.findMany({
    where: { householdId, ...(exceptUserId ? { id: { not: exceptUserId } } : {}) },
    select: { id: true },
  })
  const total: DeliveryResult = { sent: 0, removed: 0, skipped: [] }
  for (const user of users) {
    const result = await sendToUser(user.id, message, category)
    total.sent += result.sent
    total.removed += result.removed
    total.skipped.push(...result.skipped)
  }
  return total
}
