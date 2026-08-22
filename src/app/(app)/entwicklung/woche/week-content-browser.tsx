'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { WeekContent } from '@/lib/content/weeks'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

/**
 * Blättert durch die Wocheninhalte. Ab Woche 53 deckt ein Eintrag einen
 * ganzen Lebensmonat ab – das steht dann als Hinweis dabei, statt es zu
 * verschweigen.
 */
export function WeekContentBrowser({
  entries,
  currentWeek,
  initialWeek,
  childName,
}: {
  entries: WeekContent[]
  currentWeek: number
  initialWeek: number
  childName: string
}) {
  const findIndex = useMemo(
    () => (week: number) => {
      let index = 0
      for (let i = 0; i < entries.length; i++) {
        if (entries[i]!.week <= week) index = i
        else break
      }
      return index
    },
    [entries],
  )

  const [index, setIndex] = useState(() => findIndex(initialWeek))
  const stripRef = useRef<HTMLDivElement>(null)
  const entry = entries[index]

  useEffect(() => {
    const active = stripRef.current?.querySelector<HTMLElement>('[data-active="true"]')
    active?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [index])

  if (!entry) return null

  const currentIndex = findIndex(currentWeek)

  return (
    <div className="flex flex-col gap-4">
      <div
        ref={stripRef}
        className="flex gap-2 overflow-x-auto pb-2"
        role="tablist"
        aria-label="Woche wählen"
      >
        {entries.map((item, i) => (
          <button
            key={item.week}
            role="tab"
            aria-selected={i === index}
            data-active={i === index}
            onClick={() => setIndex(i)}
            className={cn(
              'flex size-12 shrink-0 items-center justify-center rounded-xl border-2 font-bold tabular',
              i === index
                ? 'border-primary bg-primary text-primary-foreground'
                : i === currentIndex
                  ? 'border-primary text-primary'
                  : 'border-border',
            )}
          >
            {item.week}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>{entry.title}</CardTitle>
            {isCurrentEntry(entry, currentWeek) && <Badge>Aktuell</Badge>}
          </div>
          <CardDescription>
            {entry.ageLabel}
            {entry.bundled && ` · gilt für Woche ${entry.week} bis ${entry.untilWeek}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {entry.sections.map((section) => (
            <section key={section.heading}>
              <h3 className="mb-1 text-sm font-bold uppercase tracking-wide text-muted-foreground">
                {section.heading}
              </h3>
              <p className="text-sm leading-relaxed">{section.body}</p>
            </section>
          ))}
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          disabled={index === 0}
          onClick={() => setIndex((value) => Math.max(0, value - 1))}
        >
          <ChevronLeft aria-hidden />
          Zurück
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          disabled={index >= entries.length - 1}
          onClick={() => setIndex((value) => Math.min(entries.length - 1, value + 1))}
        >
          Weiter
          <ChevronRight aria-hidden />
        </Button>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Bis Woche 52 gibt es einen Eintrag pro Woche, danach einen pro Lebensmonat.
        Alle Angaben sind Durchschnittswerte – {childName} entwickelt sich im eigenen Tempo.
      </p>
    </div>
  )
}

/** Deckt dieser Eintrag die aktuelle Lebenswoche ab? */
function isCurrentEntry(entry: WeekContent, currentWeek: number): boolean {
  return currentWeek >= entry.week && currentWeek <= entry.untilWeek
}
