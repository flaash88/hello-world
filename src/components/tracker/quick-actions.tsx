'use client'
import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { startTimerAction } from '@/lib/actions/events'
import { meldeDuplikat } from './duplicate-banner'
import { EVENT_CATEGORIES, type EventType } from '@/lib/events/types'
import { useToast } from '@/components/ui/toast'
import { EventDialog } from './event-dialog'
import { QUICK_ACTION_ICONS } from './quick-actions-icons'
import {
  SHORTCUT_PARAM,
  istShortcutAction,
  planFor,
  sollStarten,
  urlOhneAktion,
} from '@/lib/tracker/shortcut-actions'
import { cn } from '@/lib/utils'

/**
 * Ein-Tap-Schnellaktionen. Timer-Typen starten direkt (ein Tap), alles andere
 * oeffnet das Eingabeblatt (zwei Taps bis zum gespeicherten Eintrag).
 * Die groessten Flaechen stehen oben – dort, wo der Daumen hinkommt.
 */
export function QuickActions({
  childId,
  actions,
  runningTypes,
  suggestions,
  lastNursingSide,
  compact = false,
}: {
  childId: string
  actions: EventType[]
  runningTypes: string[]
  suggestions?: string[]
  lastNursingSide?: string | null
  compact?: boolean
}) {
  const [dialogType, setDialogType] = useState<EventType | null>(null)
  const [pending, startTransition] = useTransition()
  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const aktionErledigt = useRef(false)

  function activate(type: EventType) {
    const category = EVENT_CATEGORIES[type]
    // Ein Tap startet den Timer; die Details lassen sich danach nachtragen.
    if (category.timed && category.instantStart) {
      // Stillen startet mit der Seite, die laut letztem Eintrag dran ist.
      const payload =
        type === 'nursing'
          ? { side: lastNursingSide === 'left' ? 'right' : lastNursingSide === 'right' ? 'left' : 'left' }
          : {}
      startTransition(async () => {
        const result = await startTimerAction(childId, type, payload)
        if ('error' in result) {
          toast({ title: 'Nicht gestartet', description: result.error, variant: 'destructive' })
        } else {
          toast({ title: `${category.label} läuft` })
          if (result.duplikat) meldeDuplikat(result.duplikat)
        }
        router.refresh()
      })
      return
    }
    setDialogType(type)
  }

  // Verknuepfung vom Startbildschirm: `/heute?action=sleep-start`. Der
  // Parameter wird sofort aus der URL entfernt, damit ein Neuladen den Timer
  // nicht ein zweites Mal startet.
  useEffect(() => {
    if (aktionErledigt.current) return
    const wunsch = searchParams.get(SHORTCUT_PARAM)
    if (!istShortcutAction(wunsch)) return

    aktionErledigt.current = true
    window.history.replaceState(null, '', urlOhneAktion(window.location.href))

    const plan = planFor(wunsch)
    if (plan.art === 'dialog') {
      setDialogType(plan.type)
      return
    }
    if (!sollStarten(plan, runningTypes)) {
      // Laeuft schon – dann wird der laufende gezeigt, statt einen zweiten zu
      // starten.
      toast({ title: `${EVENT_CATEGORIES[plan.type].label} läuft bereits` })
      return
    }
    activate(plan.type)
    // activate haengt an vielen Werten; die Aktion soll genau einmal laufen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  return (
    <>
      <div className={cn('grid gap-2', compact ? 'grid-cols-4' : 'grid-cols-2')}>
        {actions.map((type, index) => {
          const category = EVENT_CATEGORIES[type]
          const Icon = QUICK_ACTION_ICONS[type]
          const isRunning = runningTypes.includes(type)
          // Die ersten beiden Aktionen bekommen die groesste Flaeche.
          const large = !compact && index < 2
          return (
            <button
              key={type}
              type="button"
              disabled={pending}
              onClick={() => activate(type)}
              className={cn(
                'flex items-center justify-center gap-2 rounded-2xl border-2 font-semibold transition-colors',
                large ? 'min-h-28 flex-col text-lg' : compact ? 'min-h-20 flex-col text-xs' : 'min-h-20 flex-col text-base',
                isRunning ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card',
              )}
              style={
                isRunning
                  ? undefined
                  : { borderColor: `hsl(var(--cat-${category.color}) / 0.35)` }
              }
            >
              <Icon
                className={large ? 'size-9' : 'size-7'}
                aria-hidden
                style={{ color: `hsl(var(--cat-${category.color}))` }}
              />
              <span className="leading-tight">{category.label}</span>
              {isRunning && <span className="text-xs font-normal">läuft</span>}
            </button>
          )
        })}
      </div>

      {dialogType && (
        <EventDialog
          childId={childId}
          type={dialogType}
          open
          onOpenChange={(next) => !next && setDialogType(null)}
          suggestions={suggestions}
          lastNursingSide={lastNursingSide}
        />
      )}
    </>
  )
}
