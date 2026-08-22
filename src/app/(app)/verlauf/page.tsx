import type { Metadata } from 'next'
import { getAppContext } from '@/lib/household'
import { knownFoods, recentEvents } from '@/lib/events/queries'
import { EVENT_CATEGORIES, EVENT_TYPES, type EventType } from '@/lib/events/types'
import { EventList } from '@/components/tracker/event-list'
import { EmptyState } from '@/components/ui/empty-state'
import { TypeFilter } from './type-filter'
import { Baby } from 'lucide-react'

export const metadata: Metadata = { title: 'Verlauf' }

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ typ?: string }>
}) {
  const ctx = await getAppContext()
  const child = ctx.activeChild

  if (!child) {
    return (
      <EmptyState
        icon={Baby}
        title="Noch kein Kind angelegt"
        description="Sobald ihr ein Kind angelegt habt, sammelt sich hier euer Verlauf."
      />
    )
  }

  const params = await searchParams
  const selected =
    params.typ && (EVENT_TYPES as readonly string[]).includes(params.typ)
      ? (params.typ as EventType)
      : null

  const [events, foods] = await Promise.all([
    recentEvents(child.id, ctx.members, 200, selected ? [selected] : undefined),
    knownFoods(child.id),
  ])

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl font-bold">Verlauf</h1>
      <TypeFilter selected={selected} />
      <EventList
        events={events}
        childId={child.id}
        suggestions={foods}
        emptyHint={
          selected
            ? `Für ${EVENT_CATEGORIES[selected].plural} gibt es noch keine Einträge.`
            : undefined
        }
      />
    </div>
  )
}
