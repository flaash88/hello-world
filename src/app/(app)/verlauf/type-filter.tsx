'use client'
import Link from 'next/link'
import { EVENT_CATEGORIES, EVENT_TYPES, type EventType } from '@/lib/events/types'
import { cn } from '@/lib/utils'

export function TypeFilter({ selected }: { selected: EventType | null }) {
  return (
    <nav aria-label="Nach Art filtern">
      <ul className="flex gap-2 overflow-x-auto pb-1">
        <li>
          <Link
            href="/verlauf"
            aria-current={selected === null ? 'page' : undefined}
            className={cn(
              'flex min-h-12 items-center rounded-full border-2 px-4 text-sm font-semibold',
              selected === null ? 'border-primary bg-primary/10 text-primary' : 'border-border',
            )}
          >
            Alles
          </Link>
        </li>
        {EVENT_TYPES.map((type) => {
          const category = EVENT_CATEGORIES[type]
          const active = selected === type
          return (
            <li key={type}>
              <Link
                href={`/verlauf?typ=${type}`}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-12 items-center whitespace-nowrap rounded-full border-2 px-4 text-sm font-semibold',
                  active ? 'border-primary bg-primary/10 text-primary' : 'border-border',
                )}
              >
                {category.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
