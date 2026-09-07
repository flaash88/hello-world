'use client'
import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Pause, Play, Square } from 'lucide-react'
import { pauseTimerAction, resumeTimerAction, stopTimerAction } from '@/lib/actions/events'
import { formatStopwatch } from '@/lib/time'
import { EVENT_CATEGORIES, type EventType } from '@/lib/events/types'
import { eventTitle } from '@/lib/events/format'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

export type RunningTimer = {
  id: string
  type: string
  startedAt: string
  pausedAt: string | null
  pausedSec: number
  payload: unknown
}

/**
 * Immer sichtbare Leiste ueber der Tab-Navigation. Sie ueberlebt Navigation
 * und Reload, weil der Zustand serverseitig liegt – ein App-Kill kostet nichts.
 */
export function RunningTimerBar({ timers }: { timers: RunningTimer[] }) {
  const [now, setNow] = useState(() => Date.now())
  const [pending, startTransition] = useTransition()
  const { toast } = useToast()
  const router = useRouter()

  const hasRunning = timers.some((t) => t.pausedAt === null)

  useEffect(() => {
    if (timers.length === 0) return
    const id = window.setInterval(() => setNow(Date.now()), hasRunning ? 1000 : 30_000)
    return () => window.clearInterval(id)
  }, [timers.length, hasRunning])

  const rows = useMemo(
    () =>
      timers.map((timer) => {
        const started = new Date(timer.startedAt).getTime()
        const pausedNow = timer.pausedAt ? (now - new Date(timer.pausedAt).getTime()) / 1000 : 0
        const elapsed = Math.max(0, (now - started) / 1000 - timer.pausedSec - pausedNow)
        return { timer, elapsed }
      }),
    [timers, now],
  )

  if (timers.length === 0) return null

  function stop(timer: RunningTimer) {
    startTransition(async () => {
      const result = await stopTimerAction(timer.id)
      if ('error' in result) {
        toast({ title: 'Nicht beendet', description: result.error, variant: 'destructive' })
      } else {
        toast({
          title: `${EVENT_CATEGORIES[timer.type as EventType]?.label ?? 'Timer'} beendet`,
          description: formatStopwatch(result.durationSec),
        })
      }
      router.refresh()
    })
  }

  function togglePause(timer: RunningTimer) {
    startTransition(async () => {
      const result = timer.pausedAt
        ? await resumeTimerAction(timer.id)
        : await pauseTimerAction(timer.id)
      if ('error' in result) {
        toast({ title: 'Nicht möglich', description: result.error, variant: 'destructive' })
      }
      router.refresh()
    })
  }

  return (
    <div className="safe-bottom fixed inset-x-0 bottom-14 z-40 mx-auto max-w-2xl px-3 pb-2 print:hidden">
      <ul className="flex flex-col gap-2">
        {rows.map(({ timer, elapsed }) => {
          const category = EVENT_CATEGORIES[timer.type as EventType]
          const paused = timer.pausedAt !== null
          return (
            <li
              key={timer.id}
              className={cn(
                'flex items-center gap-2 rounded-xl border-2 bg-card px-3 py-2 shadow-lg',
                paused ? 'border-border' : 'border-primary',
              )}
            >
              <span
                aria-hidden
                className={cn('size-3 shrink-0 rounded-full', !paused && 'animate-breathe')}
                style={{ backgroundColor: `hsl(var(--cat-${category?.color ?? 'other'}))` }}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {eventTitle({
                    type: timer.type,
                    startedAt: timer.startedAt,
                    endedAt: null,
                    durationSec: null,
                    payload: timer.payload,
                  })}
                  {paused && <span className="ml-1 text-muted-foreground">· pausiert</span>}
                </p>
                <p className="tabular font-display text-xl font-bold leading-tight">
                  {formatStopwatch(elapsed)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => togglePause(timer)}
                disabled={pending}
                aria-label={paused ? 'Timer fortsetzen' : 'Timer pausieren'}
                className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-border"
              >
                {paused ? <Play className="size-5" aria-hidden /> : <Pause className="size-5" aria-hidden />}
              </button>
              <button
                type="button"
                onClick={() => stop(timer)}
                disabled={pending}
                aria-label={`${category?.label ?? 'Timer'} beenden`}
                className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground"
              >
                <Square className="size-5" aria-hidden />
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
