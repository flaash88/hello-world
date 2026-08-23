'use client'
import { useMemo, useState } from 'react'
import { Check, CircleAlert, Search, ShieldAlert, X } from 'lucide-react'
import {
  FOOD_GROUPS,
  FOOD_RULES,
  VERDICT_LABEL,
  foodsByGroup,
  searchFoods,
  type Food,
  type FoodGroup,
  type FoodVerdict,
} from '@/lib/content/foods'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

const VERDICT_STYLE: Record<FoodVerdict, { badge: string; border: string; icon: typeof Check }> = {
  ok: {
    badge: 'bg-[hsl(var(--cat-solids)/0.15)] text-[hsl(var(--cat-solids))]',
    border: 'border-[hsl(var(--cat-solids)/0.4)]',
    icon: Check,
  },
  care: {
    badge: 'bg-[hsl(var(--cat-feed)/0.15)] text-[hsl(var(--cat-feed))]',
    border: 'border-[hsl(var(--cat-feed)/0.4)]',
    icon: CircleAlert,
  },
  avoid: {
    badge: 'bg-destructive/15 text-destructive',
    border: 'border-destructive/40',
    icon: ShieldAlert,
  },
}

export function FoodCheck() {
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState<FoodGroup | null>(null)

  const trimmed = query.trim()
  const searching = trimmed.length >= 2
  const results = useMemo(() => (searching ? searchFoods(trimmed) : []), [searching, trimmed])
  const browsing = group ? foodsByGroup(group) : []

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="foodSearch">Lebensmittel</Label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            id="foodSearch"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setGroup(null)
            }}
            placeholder="z. B. Sushi, Camembert, Kaffee"
            autoComplete="off"
            className="pl-11 pr-11"
          />
          {query.length > 0 && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Suche leeren"
              className="absolute right-1 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground"
            >
              <X className="size-5" aria-hidden />
            </button>
          )}
        </div>
      </div>

      {searching ? (
        results.length > 0 ? (
          <ul className="flex flex-col gap-2" data-testid="food-results">
            {results.map((food) => (
              <FoodCard key={food.key} food={food} />
            ))}
          </ul>
        ) : (
          <Card>
            <CardContent className="flex flex-col gap-2 p-4">
              <p className="font-semibold">Dazu steht hier nichts.</p>
              <p className="text-sm text-muted-foreground">
                Lieber nicht raten: Wenn du unsicher bist, gilt die Grundregel – gut durchgegart und
                frisch zubereitet ist fast alles in Ordnung, roh und lange offen gelegen nicht. Im
                Zweifel bei der Hebamme nachfragen.
              </p>
            </CardContent>
          </Card>
        )
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <span className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
              Oder durchblättern
            </span>
            <ul className="grid grid-cols-2 gap-2">
              {FOOD_GROUPS.map((entry) => (
                <li key={entry}>
                  <button
                    type="button"
                    aria-pressed={group === entry}
                    onClick={() => setGroup(group === entry ? null : entry)}
                    className={cn(
                      'flex min-h-12 w-full items-center justify-center rounded-xl border-2 px-2 text-center text-sm font-semibold',
                      group === entry ? 'border-primary bg-primary/5 text-primary' : 'border-border',
                    )}
                  >
                    {entry}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {group && (
            <ul className="flex flex-col gap-2" data-testid="food-results">
              {browsing.map((food) => (
                <FoodCard key={food.key} food={food} />
              ))}
            </ul>
          )}

          {!group && (
            <section>
              <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
                Die fünf Grundregeln
              </h2>
              <ul className="overflow-hidden rounded-xl border border-border bg-card">
                {FOOD_RULES.map((rule) => (
                  <li key={rule.title} className="border-b border-border p-3 last:border-b-0">
                    <p className="font-semibold">{rule.title}</p>
                    <p className="text-sm text-muted-foreground">{rule.text}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  )
}

function FoodCard({ food }: { food: Food }) {
  const style = VERDICT_STYLE[food.verdict]
  const Icon = style.icon

  return (
    <li>
      <Card className={cn('border-2', style.border)}>
        <CardContent className="flex flex-col gap-2 p-4">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-display text-lg font-semibold">{food.name}</h3>
            <span
              className={cn(
                'flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold',
                style.badge,
              )}
            >
              <Icon className="size-4" aria-hidden />
              {VERDICT_LABEL[food.verdict]}
            </span>
          </div>
          <p className="text-sm leading-relaxed">{food.why}</p>
          {food.how && (
            <p className="rounded-lg bg-muted px-3 py-2 text-sm">
              <span className="font-semibold">So geht’s: </span>
              {food.how}
            </p>
          )}
        </CardContent>
      </Card>
    </li>
  )
}
