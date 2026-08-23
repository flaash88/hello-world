import type { Metadata } from 'next'
import { BackLink } from '@/components/layout/back-link'
import { RecipeList } from './recipe-list'

export const metadata: Metadata = { title: 'Rezepte' }

export default function RecipesPage() {
  return (
    <div className="flex flex-col gap-4">
      <BackLink href="/wissen" label="Wissen" />
      <h1 className="font-display text-2xl font-bold">Rezepte fürs Wochenbett</h1>
      <p className="text-muted-foreground">
        Höchstens 15 Minuten aktive Zeit, das meiste mit einer Hand essbar. Was mit „vorkochen“
        markiert ist, gehört noch vor der Geburt ins Gefrierfach.
      </p>

      <RecipeList />
    </div>
  )
}
