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
