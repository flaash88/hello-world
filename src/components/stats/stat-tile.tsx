import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Eine Kennzahl. Bewusst gross gesetzt – muss aus Armlaenge lesbar sein. */
export function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  color,
  className,
}: {
  label: string
  value: string
  hint?: string
  icon?: LucideIcon
  color?: string
  className?: string
}) {
  return (
    <div className={cn('rounded-xl border border-border bg-card p-3', className)}>
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {Icon && (
          <Icon
            className="size-3.5"
            aria-hidden
            style={color ? { color: `hsl(var(--cat-${color}))` } : undefined}
          />
        )}
        {label}
      </p>
      <p className="tabular mt-0.5 font-display text-2xl font-bold leading-tight">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}
