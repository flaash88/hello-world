'use client'
import { useState } from 'react'
import { Clock } from 'lucide-react'
import { RECIPES, RECIPE_TAGS, type RecipeTag } from '@/lib/content/recipes'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export function RecipeList() {
  const [filter, setFilter] = useState<RecipeTag | null>(null)
  const recipes = filter ? RECIPES.filter((recipe) => recipe.tags.includes(filter)) : RECIPES

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
          Filtern
        </span>
        <ul className="flex flex-wrap gap-2">
          {RECIPE_TAGS.map((tag) => (
            <li key={tag}>
              <button
                type="button"
                aria-pressed={filter === tag}
                onClick={() => setFilter(filter === tag ? null : tag)}
                className={cn(
                  'flex min-h-12 items-center rounded-xl border-2 px-3 text-sm font-semibold',
                  filter === tag ? 'border-primary bg-primary/5 text-primary' : 'border-border',
                )}
              >
                {tag}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-sm text-muted-foreground">
        {recipes.length} {recipes.length === 1 ? 'Rezept' : 'Rezepte'}
      </p>

      <ul className="flex flex-col gap-2" data-testid="recipe-list">
        {recipes.map((recipe) => (
          <li key={recipe.key}>
            <Card>
              <CardContent className="flex flex-col gap-3 p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="font-display text-lg font-semibold">{recipe.title}</h2>
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="size-4" aria-hidden />
                    {recipe.minutes} Min
                  </span>
                </div>

                <p className="text-sm leading-relaxed text-muted-foreground">{recipe.why}</p>

                <ul className="flex flex-wrap gap-1.5">
                  {recipe.tags.map((tag) => (
                    <li key={tag}>
                      <Badge variant="secondary">{tag}</Badge>
                    </li>
                  ))}
                </ul>

                <div>
                  <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Zutaten
                  </h3>
                  <ul className="flex flex-col gap-0.5 pl-4 text-sm">
                    {recipe.ingredients.map((ingredient) => (
                      <li key={ingredient} className="list-disc marker:text-primary">
                        {ingredient}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    So geht’s
                  </h3>
                  <ol className="flex flex-col gap-1.5 pl-5 text-sm leading-relaxed">
                    {recipe.steps.map((step, index) => (
                      <li key={index} className="list-decimal">
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>

                {recipe.tip && (
                  <p className="rounded-lg bg-muted px-3 py-2 text-sm">
                    <span className="font-semibold">Tipp: </span>
                    {recipe.tip}
                  </p>
                )}
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  )
}
