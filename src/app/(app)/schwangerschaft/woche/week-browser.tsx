'use client'
import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { PregnancyWeekContent } from '@/lib/pregnancy/content'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatLength, formatMass } from '@/lib/units'
import { useUnits } from '@/components/units-provider'
import { clamp } from '@/lib/utils'
import { cn } from '@/lib/utils'

export function WeekBrowser({
  weeks,
  currentWeek,
  initialWeek,
}: {
  weeks: PregnancyWeekContent[]
  currentWeek: number
  initialWeek: number
}) {
  const first = weeks[0]!.week
  const last = weeks[weeks.length - 1]!.week
  const [week, setWeek] = useState(() => clamp(initialWeek, first, last))
  const units = useUnits()
  const stripRef = useRef<HTMLDivElement>(null)
  const content = weeks.find((w) => w.week === week)!

  // Die gewaehlte Woche in der Leiste mittig halten.
  useEffect(() => {
    const strip = stripRef.current
    const active = strip?.querySelector<HTMLElement>('[data-active="true"]')
    active?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [week])

  return (
    <div className="flex flex-col gap-4">
      <div
        ref={stripRef}
        className="flex gap-2 overflow-x-auto pb-2"
        role="tablist"
        aria-label="Schwangerschaftswoche wählen"
      >
        {weeks.map((entry) => (
          <button
            key={entry.week}
            role="tab"
            aria-selected={entry.week === week}
            data-active={entry.week === week}
            onClick={() => setWeek(entry.week)}
            className={cn(
              'flex size-12 shrink-0 items-center justify-center rounded-xl border-2 font-bold tabular',
              entry.week === week
                ? 'border-primary bg-primary text-primary-foreground'
                : entry.week === currentWeek
                  ? 'border-primary text-primary'
                  : 'border-border',
            )}
          >
            {entry.week}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>SSW {content.week}</CardTitle>
            {content.week === currentWeek && <Badge>Aktuell</Badge>}
          </div>
          <CardDescription>
            Etwa so groß wie {content.comparison.toLowerCase()}
            {content.lengthCm !== null &&
              ` · ${formatLength(content.lengthCm, units)} ${
                content.lengthKind === 'ssl' ? '(Scheitel–Steiß)' : '(Scheitel–Ferse)'
              }`}
            {content.weightG !== null && ` · ${formatMass(content.weightG, units)}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <section>
            <h3 className="mb-1 text-sm font-bold uppercase tracking-wide text-muted-foreground">
              Beim Baby
            </h3>
            <p className="text-sm leading-relaxed">{content.development}</p>
          </section>
          <section>
            <h3 className="mb-1 text-sm font-bold uppercase tracking-wide text-muted-foreground">
              Bei Mama
            </h3>
            <p className="text-sm leading-relaxed">{content.mother}</p>
          </section>
          <section className="rounded-xl bg-accent p-3">
            <h3 className="mb-1 text-sm font-bold uppercase tracking-wide text-accent-foreground">
              Für den Partner
            </h3>
            <p className="text-sm leading-relaxed">{content.partnerTip}</p>
          </section>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          disabled={week <= first}
          onClick={() => setWeek((w) => Math.max(first, w - 1))}
        >
          <ChevronLeft aria-hidden />
          SSW {Math.max(first, week - 1)}
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          disabled={week >= last}
          onClick={() => setWeek((w) => Math.min(last, w + 1))}
        >
          SSW {Math.min(last, week + 1)}
          <ChevronRight aria-hidden />
        </Button>
      </div>
    </div>
  )
}
