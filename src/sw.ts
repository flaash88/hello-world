/// <reference lib="webworker" />
import { defaultCache } from '@serwist/next/worker'
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist'
import { Serwist, NetworkOnly, NetworkFirst, CacheFirst, ExpirationPlugin } from 'serwist'

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}
declare const self: ServiceWorkerGlobalScope

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // Der SSE-Strom darf niemals gecacht werden.
    { matcher: ({ url }) => url.pathname === '/api/realtime', handler: new NetworkOnly() },
    // Schreibende Requests laufen ueber die IndexedDB-Queue der App, nicht ueber den SW.
    { matcher: ({ request }) => request.method !== 'GET', handler: new NetworkOnly() },
    {
      matcher: ({ url }) => url.pathname.startsWith('/uploads/'),
      handler: new CacheFirst({
        cacheName: 'sp-uploads',
        plugins: [new ExpirationPlugin({ maxEntries: 400, maxAgeSeconds: 60 * 86400 })],
      }),
    },
    // Die Notfallkarte muss ohne Netz stehen. Das Dokument wird bei jedem
    // Besuch frisch geholt und dabei gecacht; faellt das Netz aus, kommt die
    // zuletzt gesehene Fassung aus dem Cache und die Daten aus IndexedDB.
    {
      matcher: ({ request, url }) =>
        request.destination === 'document' && url.pathname === '/notfall',
      handler: new NetworkFirst({
        cacheName: 'sp-notfall',
        networkTimeoutSeconds: 3,
        plugins: [new ExpirationPlugin({ maxEntries: 2, maxAgeSeconds: 180 * 86400 })],
      }),
    },
    {
      matcher: ({ url }) => url.pathname === '/api/notfall',
      handler: new NetworkFirst({
        cacheName: 'sp-notfall',
        networkTimeoutSeconds: 3,
        plugins: [new ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 180 * 86400 })],
      }),
    },
    {
      matcher: ({ url }) => url.pathname.startsWith('/api/'),
      handler: new NetworkFirst({
        cacheName: 'sp-api',
        networkTimeoutSeconds: 6,
        plugins: [new ExpirationPlugin({ maxEntries: 120, maxAgeSeconds: 7 * 86400 })],
      }),
    },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [{ url: '/offline', matcher: ({ request }) => request.destination === 'document' }],
  },
})

serwist.addEventListeners()

// ------------------------------------------------------------ Teilen ----

/**
 * Ueber "Teilen" hereingereichte Dateien, wenn gerade kein Netz da ist.
 *
 * Der Browser schickt sie als POST an /api/share. Geht das schief, landen sie
 * in derselben IndexedDB wie die uebrige Schreib-Queue; die App schickt sie
 * beim naechsten Reconnect nach. Ohne das waere die geteilte Datei verloren,
 * und das faellt erst auf, wenn man sie sucht.
 */
const QUEUE_DB = 'sproessling'
const GETEILT_STORE = 'geteilt'

function oeffneQueueDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    // Ohne Versionsnummer: die App legt die Stores an, der Worker schreibt nur.
    const request = indexedDB.open(QUEUE_DB)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function legeGeteiltAb(datei: File, titel: string): Promise<void> {
  const db = await oeffneQueueDb()
  if (!db.objectStoreNames.contains(GETEILT_STORE)) {
    db.close()
    throw new Error('Queue noch nicht angelegt')
  }

  const bytes = await datei.arrayBuffer()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(GETEILT_STORE, 'readwrite')
    tx.objectStore(GETEILT_STORE).put({
      clientId: crypto.randomUUID(),
      bytes,
      mimeType: datei.type || 'application/octet-stream',
      name: datei.name || 'geteilt',
      titel,
      queuedAt: new Date().toISOString(),
      attempts: 0,
    })
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (event.request.method !== 'POST' || url.pathname !== '/api/share') return

  event.respondWith(
    (async () => {
      const geklont = event.request.clone()
      try {
        return await fetch(event.request)
      } catch {
        // Kein Netz: wegspeichern und den Nutzer trotzdem in der App landen
        // lassen, statt ihm eine Fehlerseite zu zeigen.
        try {
          const form = await geklont.formData()
          const titel = String(form.get('title') ?? '')
          const dateien = form
            .getAll('media')
            .filter((eintrag): eintrag is File => eintrag instanceof File)
          for (const datei of dateien) await legeGeteiltAb(datei, titel)
          return Response.redirect('/tagebuch?geteiltOffline=1', 303)
        } catch {
          return Response.redirect('/tagebuch', 303)
        }
      }
    })(),
  )
})

// -------------------------------------------------------------- Web Push ----

self.addEventListener('push', (event) => {
  if (!event.data) return
  let payload: { title?: string; body?: string; url?: string; tag?: string } = {}
  try {
    payload = event.data.json()
  } catch {
    payload = { title: 'Sprössling', body: event.data.text() }
  }
  event.waitUntil(
    self.registration.showNotification(payload.title ?? 'Sprössling', {
      body: payload.body ?? '',
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-96.png',
      tag: payload.tag ?? 'sproessling',
      data: { url: payload.url ?? '/' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = (event.notification.data as { url?: string } | undefined)?.url ?? '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          void client.navigate(target)
          return client.focus()
        }
      }
      return self.clients.openWindow(target)
    }),
  )
})
