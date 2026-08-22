'use client'
import * as React from 'react'
import { useRouter } from 'next/navigation'

export type RealtimeEvent = {
  channel: string
  childId?: string | null
  householdId?: string
  kind: string
  id?: string
  at: string
}

type Listener = (event: RealtimeEvent) => void

const RealtimeContext = React.createContext<{
  connected: boolean
  subscribe: (listener: Listener) => () => void
} | null>(null)

/**
 * Server-Sent Events aus Postgres LISTEN/NOTIFY. Bei jeder Aenderung durch den
 * anderen Elternteil wird der Router-Cache aufgefrischt – so sehen beide
 * dasselbe, ohne dass jemand neu laden muss.
 */
export function RealtimeProvider({
  childId,
  children,
}: {
  childId: string | null
  children: React.ReactNode
}) {
  const router = useRouter()
  const [connected, setConnected] = React.useState(false)
  const listeners = React.useRef(new Set<Listener>())

  const subscribe = React.useCallback((listener: Listener) => {
    listeners.current.add(listener)
    return () => {
      listeners.current.delete(listener)
    }
  }, [])

  React.useEffect(() => {
    let source: EventSource | null = null
    let retry = 0
    let reconnectTimer: number | undefined
    let stopped = false

    function connect() {
      if (stopped) return
      source = new EventSource('/api/realtime')
      source.onopen = () => {
        retry = 0
        setConnected(true)
      }
      source.onmessage = (message) => {
        try {
          const event = JSON.parse(message.data) as RealtimeEvent
          if (event.kind === 'ping') return
          listeners.current.forEach((l) => l(event))
          router.refresh()
        } catch {
          // Kaputte Nachricht ignorieren – der naechste Ping kommt gleich.
        }
      }
      source.onerror = () => {
        setConnected(false)
        source?.close()
        // Exponentielles Backoff, gedeckelt bei 30 s.
        const delay = Math.min(30_000, 1000 * 2 ** retry++)
        reconnectTimer = window.setTimeout(connect, delay)
      }
    }

    connect()
    return () => {
      stopped = true
      window.clearTimeout(reconnectTimer)
      source?.close()
    }
  }, [router, childId])

  const value = React.useMemo(() => ({ connected, subscribe }), [connected, subscribe])
  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>
}

export function useRealtime() {
  const ctx = React.useContext(RealtimeContext)
  if (!ctx) throw new Error('useRealtime muss innerhalb von <RealtimeProvider> verwendet werden')
  return ctx
}
