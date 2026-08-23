'use client'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CloudOff, RefreshCw } from 'lucide-react'
import { clearFailed, countPending, failed } from '@/lib/offline/queue'
import { flushQueue } from '@/lib/offline/sync'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

/**
 * Zeigt an, wenn etwas noch nicht beim Server angekommen ist, und arbeitet die
 * Queue ab, sobald wieder Verbindung besteht. Im Normalfall unsichtbar.
 */
export function OfflineSync() {
  const [online, setOnline] = useState(true)
  const [queued, setQueued] = useState(0)
  const [stuck, setStuck] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const refreshCounts = useCallback(async () => {
    setQueued(await countPending())
    setStuck((await failed()).length)
  }, [])

  const sync = useCallback(async () => {
    if (!navigator.onLine) return
    setSyncing(true)
    try {
      const summary = await flushQueue()
      if (summary.applied > 0) {
        toast({
          title: `${summary.applied} ${summary.applied === 1 ? 'Eintrag' : 'Einträge'} übertragen`,
        })
        router.refresh()
      }
    } finally {
      setSyncing(false)
      await refreshCounts()
    }
  }, [refreshCounts, router, toast])

  useEffect(() => {
    setOnline(navigator.onLine)
    void refreshCounts()
    void sync()

    const onOnline = () => {
      setOnline(true)
      void sync()
    }
    const onOffline = () => setOnline(false)
    const onQueued = () => {
      void refreshCounts()
      void sync()
    }

    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    window.addEventListener('sp:queued', onQueued)
    // Sicherheitsnetz: alle zwei Minuten nachsehen, falls ein Ereignis
    // verloren ging (passiert auf iOS beim Wechsel aus dem Hintergrund).
    const timer = window.setInterval(() => void sync(), 120_000)

    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('sp:queued', onQueued)
      window.clearInterval(timer)
    }
  }, [refreshCounts, sync])

  if (online && queued === 0 && stuck === 0) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'safe-bottom fixed inset-x-0 bottom-14 z-40 mx-auto flex max-w-2xl items-center gap-2 px-3 py-2 text-sm',
      )}
    >
      <div className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 shadow-sm">
        {online ? (
          <RefreshCw className={cn('size-4 shrink-0 text-muted-foreground', syncing && 'animate-spin')} aria-hidden />
        ) : (
          <CloudOff className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        )}
        <span className="flex-1">
          {!online
            ? queued > 0
              ? `Offline · ${queued} ${queued === 1 ? 'Eintrag wartet' : 'Einträge warten'}`
              : 'Offline · Einträge werden gespeichert'
            : stuck > 0
              ? `${stuck} ${stuck === 1 ? 'Eintrag lässt' : 'Einträge lassen'} sich nicht übertragen`
              : `${queued} wird übertragen …`}
        </span>
        {stuck > 0 && online && (
          <button
            type="button"
            onClick={async () => {
              const removed = await clearFailed()
              toast({ title: `${removed} verworfen` })
              await refreshCounts()
            }}
            className="shrink-0 rounded-lg px-2 py-1 font-bold uppercase text-destructive"
          >
            Verwerfen
          </button>
        )}
      </div>
    </div>
  )
}
