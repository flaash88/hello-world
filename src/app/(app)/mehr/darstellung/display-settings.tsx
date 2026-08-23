'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { EVENT_CATEGORIES, EVENT_TYPES, type EventType } from '@/lib/events/types'
import {
  MAX_QUICK_ACTIONS,
  START_SCREEN_OPTIONS,
  type StartScreen,
} from '@/lib/settings/display'
import { updateDisplayAction, updateUnitsAction } from '@/lib/actions/settings'
import { formatUnit, type UnitPrefs } from '@/lib/units'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'
import { QUICK_ACTION_ICONS } from '@/components/tracker/quick-actions-icons'
import { cn } from '@/lib/utils'

type UnitRow = {
  key: keyof UnitPrefs
  label: string
  options: { value: string; label: string }[]
  /** Beispielwert in metrischer Speichergrösse. */
  sample: number
}

const UNIT_ROWS: UnitRow[] = [
  {
    key: 'weight',
    label: 'Gewicht',
    options: [
      { value: 'kg', label: 'Kilogramm' },
      { value: 'lb', label: 'Pfund' },
    ],
    sample: 6.25,
  },
  {
    key: 'length',
    label: 'Länge',
    options: [
      { value: 'cm', label: 'Zentimeter' },
      { value: 'in', label: 'Zoll' },
    ],
    sample: 62.5,
  },
  {
    key: 'temp',
    label: 'Temperatur',
    options: [
      { value: 'c', label: 'Celsius' },
      { value: 'f', label: 'Fahrenheit' },
    ],
    sample: 37,
  },
  {
    key: 'volume',
    label: 'Menge',
    options: [
      { value: 'ml', label: 'Milliliter' },
      { value: 'oz', label: 'Unzen' },
    ],
    sample: 120,
  },
]

export function DisplaySettings({
  units,
  startScreen,
  quickActions,
  hasChild,
  hasPregnancy,
}: {
  units: UnitPrefs
  startScreen: StartScreen
  quickActions: EventType[]
  hasChild: boolean
  hasPregnancy: boolean
}) {
  return (
    <div className="flex flex-col gap-4">
      <UnitsCard units={units} />
      <StartScreenCard
        startScreen={startScreen}
        hasChild={hasChild}
        hasPregnancy={hasPregnancy}
        quickActions={quickActions}
      />
    </div>
  )
}

function UnitsCard({ units }: { units: UnitPrefs }) {
  const [draft, setDraft] = useState<UnitPrefs>(units)
  const [pending, startTransition] = useTransition()
  const { toast } = useToast()
  const router = useRouter()

  function save() {
    startTransition(async () => {
      const result = await updateUnitsAction({
        unitWeight: draft.weight,
        unitLength: draft.length,
        unitTemp: draft.temp,
        unitVolume: draft.volume,
      })
      if ('error' in result) {
        toast({ title: 'Nicht gespeichert', description: result.error, variant: 'destructive' })
        return
      }
      toast({ title: 'Einheiten gespeichert' })
      router.refresh()
    })
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Einheiten</CardTitle>
        <CardDescription>
          Gespeichert wird immer metrisch – umgerechnet wird nur die Anzeige. Ein Wechsel ändert
          also nichts an euren Daten.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {UNIT_ROWS.map((row) => (
          <div key={row.key} className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold">{row.label}</span>
            <div className="grid grid-cols-2 gap-2">
              {row.options.map((option) => {
                const active = draft[row.key] === option.value
                const preview = { ...draft, [row.key]: option.value } as UnitPrefs
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setDraft((prev) => ({ ...prev, [row.key]: option.value }))}
                    className={cn(
                      'flex min-h-14 flex-col items-start justify-center rounded-xl border-2 px-3 text-left',
                      active ? 'border-primary bg-primary/5' : 'border-border',
                    )}
                  >
                    <span className="font-semibold">{option.label}</span>
                    <span className="tabular text-xs text-muted-foreground">
                      {formatUnit(row.key, row.sample, preview)}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
        <Button onClick={save} disabled={pending}>
          {pending ? 'Speichert …' : 'Einheiten speichern'}
        </Button>
      </CardContent>
    </Card>
  )
}

function StartScreenCard({
  startScreen,
  quickActions,
  hasChild,
  hasPregnancy,
}: {
  startScreen: StartScreen
  quickActions: EventType[]
  hasChild: boolean
  hasPregnancy: boolean
}) {
  const [screen, setScreen] = useState<StartScreen>(startScreen)
  const [actions, setActions] = useState<EventType[]>(quickActions)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const { toast } = useToast()
  const router = useRouter()

  function toggle(type: EventType) {
    setError(null)
    setActions((prev) => {
      if (prev.includes(type)) return prev.filter((entry) => entry !== type)
      if (prev.length >= MAX_QUICK_ACTIONS) {
        setError(`Mehr als ${MAX_QUICK_ACTIONS} Schnellaktionen passen nicht auf den Bildschirm.`)
        return prev
      }
      // Reihenfolge bleibt die feste Kategorienreihenfolge – so springt nichts
      // herum, wenn man eine Aktion aus- und wieder einschaltet.
      return EVENT_TYPES.filter((entry) => entry === type || prev.includes(entry))
    })
  }

  function save() {
    setError(null)
    startTransition(async () => {
      const result = await updateDisplayAction({ startScreen: screen, quickActions: actions })
      if ('error' in result) {
        setError(result.error)
        return
      }
      toast({ title: 'Gespeichert' })
      router.refresh()
    })
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Startbildschirm & Schnellaktionen</CardTitle>
        <CardDescription>
          Was ihr seht, wenn die App aufgeht – und welche Knöpfe ganz oben in Daumenreichweite
          liegen.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          {START_SCREEN_OPTIONS.map((option) => {
            const disabled =
              (option.needsChild && !hasChild) || (option.needsPregnancy && !hasPregnancy)
            return (
              <button
                key={option.value}
                type="button"
                disabled={disabled}
                aria-pressed={screen === option.value}
                onClick={() => setScreen(option.value)}
                className={cn(
                  'flex min-h-14 items-center justify-between rounded-xl border-2 px-4 text-left',
                  screen === option.value ? 'border-primary bg-primary/5' : 'border-border',
                  disabled && 'opacity-40',
                )}
              >
                <span>
                  <span className="block font-semibold">{option.label}</span>
                  <span className="block text-xs text-muted-foreground">
                    {disabled ? 'Gerade nichts anzuzeigen' : option.hint}
                  </span>
                </span>
              </button>
            )
          })}
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold">
            Schnellaktionen ({actions.length}/{MAX_QUICK_ACTIONS})
          </span>
          <ul className="grid grid-cols-3 gap-2">
            {EVENT_TYPES.map((type) => {
              const Icon = QUICK_ACTION_ICONS[type]
              const active = actions.includes(type)
              return (
                <li key={type}>
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggle(type)}
                    className={cn(
                      'flex min-h-touch w-full flex-col items-center justify-center gap-1 rounded-xl border-2 px-1 py-2 text-xs font-semibold',
                      active ? 'border-primary bg-primary/5' : 'border-border',
                    )}
                  >
                    <Icon className="size-5" aria-hidden />
                    {EVENT_CATEGORIES[type].label}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>

        {error && (
          <p data-testid="form-error" className="text-sm font-medium text-destructive">
            {error}
          </p>
        )}
        <Button onClick={save} disabled={pending}>
          {pending ? 'Speichert …' : 'Speichern'}
        </Button>
      </CardContent>
    </Card>
  )
}
