'use client'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { OptionGrid, type Option } from './option-grid'
import { NumberStepper } from './number-stepper'
import {
  BOTTLE_CONTENT_LABEL,
  BOTTLE_CONTENTS,
  DIAPER_KIND_LABEL,
  DIAPER_KINDS,
  HEALTH_KIND_LABEL,
  HEALTH_KINDS,
  MOOD_REASON_LABEL,
  MOOD_REASONS,
  NURSING_SIDE_LABEL,
  NURSING_SIDES,
  OTHER_KIND_LABEL,
  OTHER_KINDS,
  SLEEP_AID_LABEL,
  SLEEP_AIDS,
  SLEEP_KIND_LABEL,
  SLEEP_KINDS,
  SLEEP_LOCATION_LABEL,
  SLEEP_LOCATIONS,
  STOOL_COLORS,
  STOOL_TEXTURES,
  type EventType,
} from '@/lib/events/types'

export type PayloadState = Record<string, unknown>

function options(values: readonly string[], labels: Record<string, string>): Option[] {
  return values.map((value) => ({ value, label: labels[value] ?? value }))
}

function num(payload: PayloadState, key: string): number | null {
  const value = payload[key]
  return typeof value === 'number' ? value : null
}

function str(payload: PayloadState, key: string): string | null {
  const value = payload[key]
  return typeof value === 'string' ? value : null
}

type FieldProps = {
  payload: PayloadState
  onChange: (next: PayloadState) => void
  /** Autocomplete-Vorschlaege aus bisherigen Eintraegen (Beikost). */
  suggestions?: string[]
  /** Seitenvorschlag beim Stillen ("zuletzt links"). */
  lastNursingSide?: string | null
}

export function PayloadFields({ type, ...props }: FieldProps & { type: EventType }) {
  switch (type) {
    case 'sleep':
      return <SleepFields {...props} />
    case 'nursing':
      return <NursingFields {...props} />
    case 'bottle':
      return <BottleFields {...props} />
    case 'pumping':
      return <PumpingFields {...props} />
    case 'solids':
      return <SolidsFields {...props} />
    case 'diaper':
      return <DiaperFields {...props} />
    case 'mood':
      return <MoodFields {...props} />
    case 'health':
      return <HealthFields {...props} />
    case 'other':
      return <OtherFields {...props} />
  }
}

function set(props: FieldProps, key: string, value: unknown) {
  const next = { ...props.payload }
  if (value === null || value === undefined || value === '') delete next[key]
  else next[key] = value
  props.onChange(next)
}

// ------------------------------------------------------------------ Schlaf --

function SleepFields(props: FieldProps) {
  const { payload } = props
  return (
    <>
      <OptionGrid
        label="Art"
        required
        options={options(SLEEP_KINDS, SLEEP_KIND_LABEL)}
        value={str(payload, 'kind') ?? 'nap'}
        onChange={(value) => set(props, 'kind', value)}
      />
      <OptionGrid
        label="Wo?"
        columns={2}
        options={options(SLEEP_LOCATIONS, SLEEP_LOCATION_LABEL)}
        value={str(payload, 'location')}
        onChange={(value) => set(props, 'location', value)}
      />
      <OptionGrid
        label="Einschlafhilfe"
        columns={2}
        options={options(SLEEP_AIDS, SLEEP_AID_LABEL)}
        value={str(payload, 'aid')}
        onChange={(value) => set(props, 'aid', value)}
      />
      <NumberStepper
        id="fallAsleepMin"
        label="Einschlafdauer"
        unit="Minuten"
        step={5}
        max={240}
        value={num(payload, 'fallAsleepSec') === null ? null : Math.round(num(payload, 'fallAsleepSec')! / 60)}
        onChange={(value) => set(props, 'fallAsleepSec', value === null ? null : value * 60)}
      />
      <NumberStepper
        id="wakeCount"
        label="Nachtwachen"
        step={1}
        max={50}
        value={num(payload, 'wakeCount')}
        onChange={(value) => set(props, 'wakeCount', value)}
      />
    </>
  )
}

// ----------------------------------------------------------------- Stillen --

function NursingFields(props: FieldProps) {
  const { payload, lastNursingSide } = props
  const side = str(payload, 'side') ?? 'left'
  const suggestion =
    lastNursingSide === 'left' ? 'right' : lastNursingSide === 'right' ? 'left' : null

  return (
    <>
      <OptionGrid
        label="Seite"
        required
        columns={3}
        options={NURSING_SIDES.map((value) => ({
          value,
          label: NURSING_SIDE_LABEL[value],
          hint: value === suggestion ? 'Vorschlag' : undefined,
        }))}
        value={side}
        onChange={(value) => set(props, 'side', value)}
      />
      {lastNursingSide && (
        <p className="-mt-2 text-xs text-muted-foreground">
          Zuletzt {NURSING_SIDE_LABEL[lastNursingSide as 'left']?.toLowerCase() ?? lastNursingSide}.
        </p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <NumberStepper
          id="leftMin"
          label="Links"
          unit="Min"
          step={1}
          max={240}
          value={num(payload, 'leftSec') === null ? null : Math.round(num(payload, 'leftSec')! / 60)}
          onChange={(value) => set(props, 'leftSec', value === null ? null : value * 60)}
        />
        <NumberStepper
          id="rightMin"
          label="Rechts"
          unit="Min"
          step={1}
          max={240}
          value={num(payload, 'rightSec') === null ? null : Math.round(num(payload, 'rightSec')! / 60)}
          onChange={(value) => set(props, 'rightSec', value === null ? null : value * 60)}
        />
      </div>
    </>
  )
}

// ----------------------------------------------------------------- Flasche --

function BottleFields(props: FieldProps) {
  const { payload } = props
  return (
    <>
      <OptionGrid
        label="Inhalt"
        required
        options={options(BOTTLE_CONTENTS, BOTTLE_CONTENT_LABEL)}
        value={str(payload, 'content') ?? 'formula'}
        onChange={(value) => set(props, 'content', value)}
      />
      <NumberStepper
        id="amountMl"
        label="Menge"
        unit="ml"
        step={10}
        max={500}
        value={num(payload, 'amountMl')}
        onChange={(value) => set(props, 'amountMl', value)}
      />
      <NumberStepper
        id="leftoverMl"
        label="Rest in der Flasche"
        unit="ml"
        step={10}
        max={500}
        value={num(payload, 'leftoverMl')}
        onChange={(value) => set(props, 'leftoverMl', value)}
      />
    </>
  )
}

// --------------------------------------------------------------- Abpumpen --

function PumpingFields(props: FieldProps) {
  const { payload } = props
  return (
    <>
      <OptionGrid
        label="Seite"
        required
        columns={3}
        options={options(NURSING_SIDES, NURSING_SIDE_LABEL)}
        value={str(payload, 'side') ?? 'both'}
        onChange={(value) => set(props, 'side', value)}
      />
      <NumberStepper
        id="pumpAmount"
        label="Menge gesamt"
        unit="ml"
        step={10}
        max={1000}
        value={num(payload, 'amountMl')}
        onChange={(value) => set(props, 'amountMl', value)}
      />
      <div className="grid grid-cols-2 gap-3">
        <NumberStepper
          id="pumpLeft"
          label="Links"
          unit="ml"
          step={10}
          max={500}
          value={num(payload, 'leftMl')}
          onChange={(value) => set(props, 'leftMl', value)}
        />
        <NumberStepper
          id="pumpRight"
          label="Rechts"
          unit="ml"
          step={10}
          max={500}
          value={num(payload, 'rightMl')}
          onChange={(value) => set(props, 'rightMl', value)}
        />
      </div>
    </>
  )
}

// ----------------------------------------------------------------- Beikost --

const AMOUNT_OPTIONS: Option[] = [
  { value: 'taste', label: 'Gekostet' },
  { value: 'little', label: 'Ein wenig' },
  { value: 'half', label: 'Halbe Portion' },
  { value: 'full', label: 'Ganze Portion' },
]

const REACTION_OPTIONS: Option[] = [
  { value: 'liked', label: 'Hat geschmeckt' },
  { value: 'neutral', label: 'Ging so' },
  { value: 'refused', label: 'Verweigert' },
  { value: 'reaction', label: 'Reaktion', hint: 'Ausschlag, Bauchweh …' },
]

function SolidsFields(props: FieldProps) {
  const { payload, suggestions = [] } = props
  const foods = Array.isArray(payload.foods) ? (payload.foods as string[]) : []
  const [draft, setDraft] = useState('')

  function addFood(value: string) {
    const trimmed = value.trim()
    if (!trimmed || foods.includes(trimmed)) {
      setDraft('')
      return
    }
    set(props, 'foods', [...foods, trimmed].slice(0, 15))
    setDraft('')
  }

  const matching = draft.trim()
    ? suggestions
        .filter((s) => s.toLowerCase().includes(draft.trim().toLowerCase()) && !foods.includes(s))
        .slice(0, 6)
    : suggestions.filter((s) => !foods.includes(s)).slice(0, 8)

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="food">Lebensmittel</Label>
        <div className="flex gap-2">
          <Input
            id="food"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                addFood(draft)
              }
            }}
            placeholder="z. B. Karotte"
            maxLength={60}
            autoComplete="off"
          />
          <button
            type="button"
            onClick={() => addFood(draft)}
            className="min-h-12 shrink-0 rounded-lg border-2 border-border px-4 font-semibold"
          >
            Hinzu
          </button>
        </div>
        {foods.length > 0 && (
          <ul className="flex flex-wrap gap-1.5 pt-1">
            {foods.map((food) => (
              <li key={food}>
                <button
                  type="button"
                  onClick={() => set(props, 'foods', foods.filter((f) => f !== food))}
                  aria-label={`${food} entfernen`}
                  className="min-h-10 rounded-full bg-primary/10 px-3 text-sm font-semibold text-primary"
                >
                  {food} ×
                </button>
              </li>
            ))}
          </ul>
        )}
        {matching.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            <span className="self-center text-xs text-muted-foreground">Zuletzt:</span>
            {matching.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => addFood(suggestion)}
                className="min-h-10 rounded-full border border-border px-3 text-sm"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>

      <OptionGrid
        label="Menge"
        options={AMOUNT_OPTIONS}
        value={str(payload, 'amount')}
        onChange={(value) => set(props, 'amount', value)}
      />
      <OptionGrid
        label="Reaktion"
        options={REACTION_OPTIONS}
        value={str(payload, 'reaction')}
        onChange={(value) => set(props, 'reaction', value)}
      />
      <div className="flex items-center justify-between gap-4">
        <Label htmlFor="firstTime">Zum ersten Mal probiert</Label>
        <Switch
          id="firstTime"
          checked={payload.firstTime === true}
          onCheckedChange={(checked) => set(props, 'firstTime', checked || null)}
        />
      </div>
      {str(payload, 'reaction') === 'reaction' && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="reactionNote">Was war zu beobachten?</Label>
          <Input
            id="reactionNote"
            maxLength={300}
            value={str(payload, 'reactionNote') ?? ''}
            onChange={(event) => set(props, 'reactionNote', event.target.value)}
          />
        </div>
      )}
    </>
  )
}

// ------------------------------------------------------------------ Windel --

function DiaperFields(props: FieldProps) {
  const { payload } = props
  const kind = str(payload, 'kind') ?? 'wet'
  const showStool = kind === 'dirty' || kind === 'both'

  return (
    <>
      <OptionGrid
        label="Inhalt"
        required
        columns={2}
        options={options(DIAPER_KINDS, DIAPER_KIND_LABEL)}
        value={kind}
        onChange={(value) => set(props, 'kind', value)}
      />
      {showStool && (
        <>
          <OptionGrid
            label="Farbe"
            columns={2}
            options={STOOL_COLORS.map((c) => ({ value: c.value, label: c.label, hint: c.hint, swatch: c.swatch }))}
            value={str(payload, 'color')}
            onChange={(value) => set(props, 'color', value)}
          />
          <OptionGrid
            label="Konsistenz"
            columns={2}
            options={STOOL_TEXTURES.map((t) => ({ value: t.value, label: t.label, hint: t.hint }))}
            value={str(payload, 'texture')}
            onChange={(value) => set(props, 'texture', value)}
          />
        </>
      )}
      <div className="flex items-center justify-between gap-4">
        <Label htmlFor="leaked">Ausgelaufen</Label>
        <Switch
          id="leaked"
          checked={payload.leaked === true}
          onCheckedChange={(checked) => set(props, 'leaked', checked || null)}
        />
      </div>
      <div className="flex items-center justify-between gap-4">
        <Label htmlFor="cream">Wundcreme verwendet</Label>
        <Switch
          id="cream"
          checked={payload.cream === true}
          onCheckedChange={(checked) => set(props, 'cream', checked || null)}
        />
      </div>
    </>
  )
}

// ---------------------------------------------------------------- Stimmung --

function MoodFields(props: FieldProps) {
  const { payload } = props
  const intensity = num(payload, 'intensity') ?? 3
  const LABELS = ['ganz ruhig', 'quengelig', 'unzufrieden', 'weint', 'untröstlich']

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="intensity">
          Intensität: <span className="text-foreground">{LABELS[intensity - 1]}</span>
        </Label>
        <Slider
          id="intensity"
          min={1}
          max={5}
          step={1}
          value={[intensity]}
          onValueChange={([value]) => set(props, 'intensity', value)}
          aria-label="Intensität von 1 bis 5"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>1</span>
          <span>5</span>
        </div>
      </div>
      <OptionGrid
        label="Vermuteter Grund"
        columns={2}
        options={options(MOOD_REASONS, MOOD_REASON_LABEL)}
        value={str(payload, 'reason')}
        onChange={(value) => set(props, 'reason', value)}
      />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="soothedBy">Was hat geholfen?</Label>
        <Input
          id="soothedBy"
          maxLength={120}
          value={str(payload, 'soothedBy') ?? ''}
          onChange={(event) => set(props, 'soothedBy', event.target.value)}
          placeholder="z. B. Tragen und Schaukeln"
        />
      </div>
    </>
  )
}

// -------------------------------------------------------------- Gesundheit --

const MEASURE_OPTIONS: Option[] = [
  { value: 'rectal', label: 'Rektal', hint: 'Am genauesten' },
  { value: 'ear', label: 'Ohr' },
  { value: 'forehead', label: 'Stirn' },
  { value: 'armpit', label: 'Achsel' },
]

function HealthFields(props: FieldProps) {
  const { payload } = props
  const kind = str(payload, 'kind') ?? 'temperature'

  return (
    <>
      <OptionGrid
        label="Art"
        required
        columns={2}
        options={options(HEALTH_KINDS, HEALTH_KIND_LABEL)}
        value={kind}
        onChange={(value) => set(props, 'kind', value)}
      />

      {kind === 'temperature' && (
        <>
          <NumberStepper
            id="temperatureC"
            label="Temperatur"
            unit="°C"
            step={0.1}
            min={30}
            max={45}
            placeholder="37,0"
            value={num(payload, 'temperatureC')}
            onChange={(value) => set(props, 'temperatureC', value)}
          />
          <OptionGrid
            label="Gemessen"
            columns={2}
            options={MEASURE_OPTIONS}
            value={str(payload, 'measuredAt')}
            onChange={(value) => set(props, 'measuredAt', value)}
          />
        </>
      )}

      {kind === 'medication' && (
        <>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="medication">Medikament</Label>
            <Input
              id="medication"
              maxLength={80}
              value={str(payload, 'medication') ?? ''}
              onChange={(event) => set(props, 'medication', event.target.value)}
              placeholder="z. B. Nurofen Saft"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <NumberStepper
              id="doseMl"
              label="Dosis"
              unit="ml"
              step={0.5}
              max={200}
              value={num(payload, 'doseMl')}
              onChange={(value) => set(props, 'doseMl', value)}
            />
            <NumberStepper
              id="doseMg"
              label="Dosis"
              unit="mg"
              step={10}
              max={5000}
              value={num(payload, 'doseMg')}
              onChange={(value) => set(props, 'doseMg', value)}
            />
          </div>
          <NumberStepper
            id="repeatHours"
            label="Frühestens wieder in"
            unit="Stunden"
            step={1}
            min={0.5}
            max={48}
            value={num(payload, 'repeatHours')}
            onChange={(value) => set(props, 'repeatHours', value)}
          />
        </>
      )}

      {kind === 'symptom' && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="symptom">Symptom</Label>
          <Input
            id="symptom"
            maxLength={120}
            value={str(payload, 'symptom') ?? ''}
            onChange={(event) => set(props, 'symptom', event.target.value)}
            placeholder="z. B. Husten seit gestern"
          />
        </div>
      )}

      {kind === 'vaccination' && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="vaccine">Impfung</Label>
          <Input
            id="vaccine"
            maxLength={120}
            value={str(payload, 'vaccine') ?? ''}
            onChange={(event) => set(props, 'vaccine', event.target.value)}
            placeholder="z. B. 6-fach, 1. Teilimpfung"
          />
        </div>
      )}
    </>
  )
}

// --------------------------------------------------------------- Sonstiges --

function OtherFields(props: FieldProps) {
  const { payload } = props
  return (
    <>
      <OptionGrid
        label="Art"
        required
        columns={2}
        options={options(OTHER_KINDS, OTHER_KIND_LABEL)}
        value={str(payload, 'kind') ?? 'note'}
        onChange={(value) => set(props, 'kind', value)}
      />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="label">Eigene Bezeichnung</Label>
        <Input
          id="label"
          maxLength={120}
          value={str(payload, 'label') ?? ''}
          onChange={(event) => set(props, 'label', event.target.value)}
          placeholder="Optional"
        />
      </div>
    </>
  )
}
