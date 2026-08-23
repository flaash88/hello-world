'use client'

/** Base64-URL nach Uint8Array – so will es die Push-API. */
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const normalized = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(normalized)
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)))
}

function csrfToken(): string {
  const match = document.cookie.match(/(?:^|;\s*)sp_csrf=([^;]+)/)
  return match?.[1] ? decodeURIComponent(match[1]) : ''
}

export type PushStatus = 'unsupported' | 'denied' | 'granted' | 'default'

export function pushStatus(): PushStatus {
  if (typeof window === 'undefined') return 'unsupported'
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return 'unsupported'
  }
  return Notification.permission as PushStatus
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  if (pushStatus() === 'unsupported') return null
  const registration = await navigator.serviceWorker.ready
  return registration.pushManager.getSubscription()
}

/**
 * Fragt die Berechtigung ab, meldet das Geraet an und speichert das Abo am
 * Server. Gibt eine sprechende Fehlermeldung zurueck statt zu werfen.
 */
export async function enablePush(vapidPublicKey: string): Promise<{ ok: true } | { error: string }> {
  const status = pushStatus()
  if (status === 'unsupported') {
    return { error: 'Dieser Browser unterstützt keine Push-Benachrichtigungen.' }
  }
  if (!vapidPublicKey) {
    return { error: 'Am Server fehlen die VAPID-Schlüssel – siehe README.' }
  }

  const permission = status === 'granted' ? 'granted' : await Notification.requestPermission()
  if (permission !== 'granted') {
    return { error: 'Ohne Erlaubnis für Benachrichtigungen geht es nicht.' }
  }

  const registration = await navigator.serviceWorker.ready
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
    }))

  const response = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken() },
    body: JSON.stringify(subscription.toJSON()),
  })
  if (!response.ok) {
    return { error: 'Das Abo konnte am Server nicht gespeichert werden.' }
  }
  return { ok: true }
}

export async function disablePush(): Promise<void> {
  const subscription = await currentSubscription()
  if (!subscription) return
  await fetch('/api/push/subscribe', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken() },
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  })
  await subscription.unsubscribe()
}
