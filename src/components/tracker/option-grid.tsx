'use client'
import { cn } from '@/lib/utils'

export type Option = { value: string; label: string; hint?: string; swatch?: string }

/**
 * Auswahl als grosse Flaechen statt als Dropdown – im Dunkeln mit einer Hand
 * deutlich treffsicherer. Ohne `required` laesst sich die Auswahl abwaehlen.
 */
export function OptionGrid({
  options,
  value,
  onChange,
  columns = 2,
  label,
  required = false,
}: {
  options: readonly Option[]
  value: string | null | undefined
  onChange: (value: string | null) => void
  columns?: 1 | 2 | 3
  label: string
  required?: boolean
}) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-semibold text-muted-foreground">{label}</legend>
      <div
        className={cn(
          'grid gap-2',
          columns === 1 && 'grid-cols-1',
          columns === 2 && 'grid-cols-2',
          columns === 3 && 'grid-cols-3',
        )}
      >
        {options.map((option) => {
          const active = value === option.value
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(active && !required ? null : option.value)}
              className={cn(
                'flex min-h-14 flex-col items-start justify-center gap-0.5 rounded-xl border-2 px-3 py-2 text-left',
                active ? 'border-primary bg-primary/10' : 'border-border',
              )}
            >
              <span className="flex items-center gap-2 font-semibold leading-tight">
                {option.swatch && (
                  <span
                    aria-hidden
                    className="size-4 shrink-0 rounded-full border border-border"
                    style={{ backgroundColor: option.swatch }}
                  />
                )}
                {option.label}
              </span>
              {option.hint && (
                <span className="text-xs leading-tight text-muted-foreground">{option.hint}</span>
              )}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
