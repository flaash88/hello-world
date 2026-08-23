'use client'
import { useState } from 'react'
import { EVENT_CATEGORIES, type EventType } from '@/lib/events/types'
import { useUnits } from '@/components/units-provider'
import { eventDetail, eventDurationSec, eventTitle } from '@/lib/events/format'
import { formatDuration, formatTime, localDateKey } from '@/lib/time'
import { UserAvatar } from '@/components/ui/avatar'
import { EmptyState } from '@/components/ui/empty-state'
import { ListX } from 'lucide-react'
import { EventDialog, type EditableEvent } from './event-dialog'
import { QUICK_ACTION_ICONS } from './quick-actions-icons'
import { groupBy } from '@/lib/utils'
import { localeTag } from '@/lib/i18n'

export type ListedEvent = EditableEvent & {
  durationSec: number | null
  running: boolean
  createdBy: { id: string; displayName: string; initials: string; color: string } | null
  /** "automation" = ueber die API eingetragen, z. B. vom NFC-Tag. */
  source?: string | null
}

/**
 * Chronologische Liste, nach lokalem Tag gruppiert. Ein Tap oeffnet den
 * Eintrag zum Bearbeiten – dort ist auch das Loeschen samt Rueckgaengig.
 */
export function EventList({
  events,
  childId,
  suggestions,
  emptyHint,
  showDayHeadings = true,
}: {
  events: ListedEvent[]
  childId: string
  suggestions?: string[]
  emptyHint?: string
  showDayHeadings?: boolean
}) {
  const [editing, setEditing] = useState<ListedEvent | null>(null)
  const units = useUnits()

  if (events.length === 0) {
    return (
      <EmptyState
        icon={ListX}
        title="Noch nichts eingetragen"
        description={emptyHint ?? 'Sobald ihr etwas festhaltet, steht es hier.'}
      />
    )
  }

  const days = groupBy(events, (event) => localDateKey(new Date(event.startedAt)))

  return (
    <>
      <div className="flex flex-col gap-4" data-testid="event-list">
        {[...days.entries()].map(([day, dayEvents]) => (
          <section key={day}>
            {showDayHeadings && (
              <h3 className="mb-1.5 text-sm font-bold uppercase tracking-wide text-muted-foreground">
                {dayLabel(day)}
              </h3>
            )}
            <ul className="overflow-hidden rounded-xl border border-border bg-card">
              {dayEvents.map((event) => {
                const category = EVENT_CATEGORIES[event.type as EventType]
                const Icon = QUICK_ACTION_ICONS[event.type as EventType]
                const duration = eventDurationSec(event)
                const detail = eventDetail(event, units)
                return (
                  <li key={event.id} className="border-b border-border last:border-b-0">
                    <button
                      type="button"
                      onClick={() => setEditing(event)}
                      className="flex w-full items-center gap-3 p-3 text-left"
                    >
                      <span
                        aria-hidden
                        className="flex size-10 shrink-0 items-center justify-center rounded-xl"
                        style={{ backgroundColor: `hsl(var(--cat-${category?.color ?? 'other'}) / 0.15)` }}
                      >
                        {Icon && (
                          <Icon
                            className="size-5"
                            style={{ color: `hsl(var(--cat-${category?.color ?? 'other'}))` }}
                          />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline gap-2">
                          <span className="font-semibold">{eventTitle(event)}</span>
                          {event.running && (
                            <span className="text-xs font-semibold text-primary">läuft</span>
                          )}
                          {event.source === 'automation' && (
                            <span className="rounded border border-border px-1 text-[0.625rem] font-semibold uppercase tracking-wide text-muted-foreground">
                              Automation
                            </span>
                          )}
                        </span>
                        {detail && (
                          <span className="block truncate text-sm text-muted-foreground">{detail}</span>
                        )}
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="tabular block font-semibold">
                          {formatTime(new Date(event.startedAt))}
                        </span>
                        {duration !== null && duration > 0 && (
                          <span className="tabular block text-sm text-muted-foreground">
                            {formatDuration(duration, { short: true })}
                          </span>
                        )}
                      </span>
                      {event.createdBy && (
                        <UserAvatar
                          size="sm"
                          initials={event.createdBy.initials}
                          color={event.createdBy.color}
                          title={
                            event.source === 'automation'
                              ? `Automation (${event.createdBy.displayName})`
                              : `Eingetragen von ${event.createdBy.displayName}`
                          }
                        />
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>

      {editing && (
        <EventDialog
          childId={childId}
          type={editing.type as EventType}
          event={editing}
          open
          onOpenChange={(next) => !next && setEditing(null)}
          suggestions={suggestions}
        />
      )}
    </>
  )
}

function dayLabel(dayKey: string): string {
  const today = localDateKey(new Date())
  const yesterday = localDateKey(new Date(Date.now() - 86400000))
  if (dayKey === today) return 'Heute'
  if (dayKey === yesterday) return 'Gestern'
  const [year, month, day] = dayKey.split('-').map(Number)
  return new Date(Date.UTC(year!, month! - 1, day!)).toLocaleDateString(localeTag(), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  })
}
