import Link from 'next/link'
import { EVENT_CATEGORIES, type EventType } from '@/lib/events/types'
import { eventDetail, eventDurationSec } from '@/lib/events/format'
import { formatDuration, formatRelative } from '@/lib/time'
import type { EventRow } from '@/lib/events/queries'
import { QUICK_ACTION_ICONS } from './quick-actions-icons'

/**
 * "Zuletzt"-Zeilen: das Wichtigste auf einen Blick, ohne scrollen. Nachts oft
 * die einzige Information, die man wirklich braucht.
 */
export function LastEventsStrip({
  lastByType,
  types,
}: {
  lastByType: Map<string, EventRow>
  types: EventType[]
}) {
  const rows = types
    .map((type) => ({ type, event: lastByType.get(type) }))
    .filter((row): row is { type: EventType; event: EventRow } => Boolean(row.event))

  if (rows.length === 0) return null

  return (
    <ul className="overflow-hidden rounded-xl border border-border bg-card">
      {rows.map(({ type, event }) => {
        const category = EVENT_CATEGORIES[type]
        const Icon = QUICK_ACTION_ICONS[type]
        const duration = eventDurationSec(event)
        const detail = eventDetail(event)
        return (
          <li key={type} className="border-b border-border last:border-b-0">
            <Link href={`/verlauf?typ=${type}`} className="flex items-center gap-3 p-3">
              <span
                aria-hidden
                className="flex size-9 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: `hsl(var(--cat-${category.color}) / 0.15)` }}
              >
                <Icon className="size-5" style={{ color: `hsl(var(--cat-${category.color}))` }} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{category.label}</span>
                {detail && <span className="block truncate text-sm text-muted-foreground">{detail}</span>}
              </span>
              <span className="shrink-0 text-right text-sm">
                <span className="block font-semibold">
                  {event.running ? 'läuft' : formatRelative(new Date(event.startedAt))}
                </span>
                {!event.running && duration !== null && duration > 0 && (
                  <span className="tabular block text-muted-foreground">
                    {formatDuration(duration, { short: true })}
                  </span>
                )}
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
