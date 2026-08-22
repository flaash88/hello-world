import type { Metadata } from 'next'
import { Baby } from 'lucide-react'
import { getAppContext } from '@/lib/household'
import { ageInWeeks } from '@/lib/time'
import { correctedAgeDays } from '@/lib/sleep/windows'
import { allWeekContent } from '@/lib/content/weeks'
import { EmptyState } from '@/components/ui/empty-state'
import { BackLink } from '@/components/layout/back-link'
import { WeekContentBrowser } from './week-content-browser'

export const metadata: Metadata = { title: 'Woche für Woche' }

export default async function DevelopmentWeekPage({
  searchParams,
}: {
  searchParams: Promise<{ w?: string }>
}) {
  const ctx = await getAppContext()
  const child = ctx.activeChild

  if (!child?.birthDate) {
    return (
      <EmptyState
        icon={Baby}
        title="Noch kein Kind angelegt"
        description="Die Wocheninhalte richten sich nach dem Alter eures Kindes."
      />
    )
  }

  const weeks = ageInWeeks(child.birthDate, new Date(), ctx.timezone)
  const correctedWeeks = Math.floor(
    correctedAgeDays(weeks * 7, child.birthDate, child.dueDate) / 7,
  )

  const entries = await allWeekContent()
  const params = await searchParams
  const requested = Number(params.w)
  const initialWeek = Number.isFinite(requested) ? requested : correctedWeeks

  return (
    <div className="flex flex-col gap-4">
      <BackLink href="/entwicklung" label="Entwicklung" />
      <h1 className="font-display text-2xl font-bold">Woche für Woche</h1>
      <WeekContentBrowser
        entries={entries}
        currentWeek={correctedWeeks}
        initialWeek={initialWeek}
        childName={child.name}
      />
    </div>
  )
}
