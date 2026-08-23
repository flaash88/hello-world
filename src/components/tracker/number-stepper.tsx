'use client'
import { Minus, Plus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { clamp } from '@/lib/utils'

/**
 * Zahleneingabe mit grossen Plus-/Minus-Flaechen. Tippen geht weiterhin, aber
 * einhaendig kommt man mit den Tasten schneller ans Ziel.
 */
export function NumberStepper({
  id,
  label,
  value,
  onChange,
  step = 10,
  min = 0,
  max = 1000,
  unit,
  placeholder,
}: {
  id: string
  label: string
  value: number | null
  onChange: (value: number | null) => void
  step?: number
  min?: number
  max?: number
  unit?: string
  placeholder?: string
}) {
  function bump(delta: number) {
    const base = value ?? 0
    onChange(clamp(Math.round((base + delta) * 100) / 100, min, max))
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>
        {label}
        {unit && <span className="ml-1 font-normal">({unit})</span>}
      </Label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => bump(-step)}
          aria-label={`${label} verringern`}
          className="flex size-12 shrink-0 items-center justify-center rounded-lg border-2 border-border"
        >
          <Minus className="size-5" aria-hidden />
        </button>
        <Input
          id={id}
          inputMode="decimal"
          className="text-center text-lg font-semibold tabular"
          placeholder={placeholder}
          value={value === null ? '' : String(value).replace('.', ',')}
          onChange={(event) => {
            const raw = event.target.value.trim().replace(',', '.')
            if (raw === '') {
              onChange(null)
              return
            }
            const parsed = Number(raw)
            if (Number.isFinite(parsed)) onChange(clamp(parsed, min, max))
          }}
        />
        <button
          type="button"
          onClick={() => bump(step)}
          aria-label={`${label} erhöhen`}
          className="flex size-12 shrink-0 items-center justify-center rounded-lg border-2 border-border"
        >
          <Plus className="size-5" aria-hidden />
        </button>
      </div>
    </div>
  )
}
