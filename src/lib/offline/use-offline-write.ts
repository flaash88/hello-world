'use client'
import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { enqueue, newClientId, type QueuedOperation } from './queue'
import { flushQueue } from './sync'

/**
 * Schreibpfad der App: erst in die Queue, dann sofort synchronisieren.
 *
 * Damit ist jede Aktion offline-fest, ohne dass die aufrufende Stelle sich
 * darum kuemmern muss. Online fuehlt es sich an wie ein normaler Request –
 * die Queue ist dann nur ein sehr kurzer Zwischenstopp.
 */
export function useOfflineWrite() {
  const router = useRouter()

  return useCallback(
    async (operation: Omit<QueuedOperation, 'clientId' | 'queuedAt'>): Promise<{ queued: boolean }> => {
      const full = {
        ...operation,
        clientId: newClientId(),
        queuedAt: new Date().toISOString(),
      } as QueuedOperation

      await enqueue(full)
      window.dispatchEvent(new CustomEvent('sp:queued'))

      if (navigator.onLine) {
        const summary = await flushQueue()
        router.refresh()
        return { queued: summary.remaining > 0 }
      }
      return { queued: true }
    },
    [router],
  )
}
