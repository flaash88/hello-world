'use client'
import { useState } from 'react'
import { Plus } from 'lucide-react'
import { EVENT_CATEGORIES, EVENT_TYPES, type EventType } from '@/lib/events/types'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { EventDialog } from './event-dialog'
import { QUICK_ACTION_ICONS } from './quick-actions-icons'

/**
 * Alles, was nicht auf dem Startbildschirm liegt – einen Tap entfernt.
 * Damit bleibt jede Eintragsart in maximal zwei Taps erreichbar.
 */
export function AllActionsSheet({
  childId,
  active,
  suggestions,
  lastNursingSide,
}: {
  childId: string
  active: EventType[]
  suggestions?: string[]
  lastNursingSide?: string | null
}) {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<EventType | null>(null)

  const others = EVENT_TYPES.filter((entry) => !active.includes(entry))
  if (others.length === 0) return null

  return (
    <>
      <Button variant="outline" size="lg" className="w-full" onClick={() => setOpen(true)}>
        <Plus aria-hidden />
        Etwas anderes eintragen
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Was möchtest du eintragen?</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            {others.map((entry) => {
              const category = EVENT_CATEGORIES[entry]
              const Icon = QUICK_ACTION_ICONS[entry]
              return (
                <button
                  key={entry}
                  type="button"
                  onClick={() => {
                    setOpen(false)
                    setType(entry)
                  }}
                  className="flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-border font-semibold"
                >
                  <Icon
                    className="size-6"
                    aria-hidden
                    style={{ color: `hsl(var(--cat-${category.color}))` }}
                  />
                  {category.label}
                </button>
              )
            })}
          </div>
        </DialogContent>
      </Dialog>

      {type && (
        <EventDialog
          childId={childId}
          type={type}
          open
          onOpenChange={(next) => !next && setType(null)}
          suggestions={suggestions}
          lastNursingSide={lastNursingSide}
        />
      )}
    </>
  )
}
