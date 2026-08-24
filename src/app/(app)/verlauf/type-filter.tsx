'use client'
import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { EVENT_CATEGORIES, EVENT_TYPES, type EventType } from '@/lib/events/types'
import { cn } from '@/lib/utils'

/**
 * Filter nach Art, als Reihe zum Schieben.
 *
 * Die Reihe bleibt unter der Kopfzeile stehen. Vorher scrollte sie mit dem
 * Verlauf nach oben weg und lag dabei hinter der durchscheinenden Kopfzeile:
 * halb zu sehen, in der oberen Hälfte nicht mehr antippbar, und wer filtern
 * wollte, musste erst die ganze Liste zurückscrollen.
 *
 * Beim Öffnen wird die gewählte Art in den Blick geholt – sonst steht man mit
 * „Abpumpen" gefiltert vor einer Reihe, die vorne bei „Alles" anfängt und
 * nicht verrät, was gerade gilt.
 */
export function TypeFilter({ selected }: { selected: EventType | null }) {
  const reihe = useRef<HTMLUListElement>(null)

  useEffect(() => {
    const aktiv = reihe.current?.querySelector('[aria-current="page"]')
    // `nearest` senkrecht: Die Seite selbst soll nicht springen.
    aktiv?.scrollIntoView({ inline: 'center', block: 'nearest' })
  }, [selected])

  return (
    <nav
      aria-label="Nach Art filtern"
      className="unter-kopf sticky z-20 -mx-3 border-b border-border bg-background px-3 py-2"
    >
      <div className="relative">
        <ul ref={reihe} className="flex gap-2 overflow-x-auto pb-1 pr-6">
          <li>
            <Chip href="/verlauf" aktiv={selected === null}>
              Alles
            </Chip>
          </li>
          {EVENT_TYPES.map((type) => (
            <li key={type}>
              <Chip href={`/verlauf?typ=${type}`} aktiv={selected === type}>
                {EVENT_CATEGORIES[type].label}
              </Chip>
            </li>
          ))}
        </ul>
        {/*
         * Weicher Rand rechts: Ohne ihn sieht die Reihe aus, als hörte sie am
         * Bildschirmrand auf. Nimmt keine Taps entgegen.
         */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent"
        />
      </div>
    </nav>
  )
}

function Chip({
  href,
  aktiv,
  children,
}: {
  href: string
  aktiv: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      aria-current={aktiv ? 'page' : undefined}
      className={cn(
        'flex h-12 items-center whitespace-nowrap rounded-full border-2 px-5 text-base font-semibold',
        aktiv
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border text-foreground',
      )}
    >
      {children}
    </Link>
  )
}
