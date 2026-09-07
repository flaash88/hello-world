'use client'
import { useState } from 'react'
import { Flame, Pill, Lightbulb } from 'lucide-react'
import {
  TRIMESTERS,
  TRIMESTER_LABEL,
  TRIMESTER_RANGE,
  focusFor,
  nutrientsFor,
  type Trimester,
} from '@/lib/content/nutrition'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export function NutritionView({
  current,
  week,
}: {
  /** Trimester laut Schwangerschaft – oder null, wenn keine laeuft. */
  current: Trimester | null
  week: number | null
}) {
  const [selected, setSelected] = useState<Trimester>(current ?? 1)
  const focus = focusFor(selected)
  const nutrients = nutrientsFor(selected)

  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" aria-label="Trimester" className="grid grid-cols-3 gap-2">
        {TRIMESTERS.map((trimester) => (
          <button
            key={trimester}
            role="tab"
            type="button"
            aria-selected={selected === trimester}
            onClick={() => setSelected(trimester)}
            className={cn(
              'flex min-h-14 flex-col items-center justify-center rounded-xl border-2 px-2 text-sm font-semibold',
              selected === trimester ? 'border-primary bg-primary/5 text-primary' : 'border-border',
            )}
          >
            {trimester}. Drittel
            <span className="text-xs font-normal text-muted-foreground">
              {TRIMESTER_RANGE[trimester]}
            </span>
          </button>
        ))}
      </div>

      {current === selected && week !== null && (
        <p className="text-sm font-semibold text-primary">
          Ihr seid gerade hier – SSW {week}.
        </p>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{focus.headline}</CardTitle>
          <CardDescription>{TRIMESTER_LABEL[selected]}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm leading-relaxed">{focus.body}</p>
          <p className="flex items-start gap-2 rounded-xl bg-muted p-3 text-sm">
            <Flame className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
            <span>
              <span className="font-semibold">Wie viel mehr? </span>
              {focus.energy}
            </span>
          </p>
        </CardContent>
      </Card>

      <section>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
          Jetzt besonders wichtig
        </h2>
        <ul className="flex flex-col gap-2">
          {nutrients.map((nutrient) => (
            <li key={nutrient.key}>
              <Card>
                <CardContent className="flex flex-col gap-2 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display font-semibold">{nutrient.name}</h3>
                    {nutrient.supplement && (
                      <Badge variant="secondary" className="gap-1">
                        <Pill className="size-3" aria-hidden />
                        Präparat
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm leading-relaxed">{nutrient.why}</p>
                  <ul className="flex flex-wrap gap-1.5">
                    {nutrient.foods.map((food) => (
                      <li
                        key={food}
                        className="rounded-lg bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground"
                      >
                        {food}
                      </li>
                    ))}
                  </ul>
                  {nutrient.tip && (
                    <p className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Lightbulb className="mt-0.5 size-4 shrink-0" aria-hidden />
                      {nutrient.tip}
                    </p>
                  )}
                  {nutrient.supplement && (
                    <p className="rounded-lg border border-border px-3 py-2 text-sm">
                      <span className="font-semibold">Als Präparat: </span>
                      {nutrient.supplement}
                    </p>
                  )}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
          Was in diesem Abschnitt oft stört
        </h2>
        <ul className="flex flex-col gap-2">
          {focus.trouble.map((entry) => (
            <li key={entry.problem}>
              <Card>
                <CardContent className="flex flex-col gap-1 p-4">
                  <h3 className="font-semibold">{entry.problem}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{entry.help}</p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
