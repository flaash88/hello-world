import type { Metadata } from 'next'
import { Baby } from 'lucide-react'
import { getAppContext } from '@/lib/household'
import { loadSleepHeatmap, loadStats } from '@/lib/stats/queries'
import { PERIOD_DAYS, type Period } from '@/lib/stats/periods'
import { buildWeeklyReview } from '@/lib/stats/weekly-review'
import { localDateKey, addDays } from '@/lib/time'
import { offeneDuplikate } from '@/lib/events/duplicate-service'
import { EmptyState } from '@/components/ui/empty-state'
import { StatsView } from './stats-view'

export const metadata: Metadata = { title: 'Auswertung' }

function parsePeriod(value: string | undefined): Period {
  return value === 'day' || value === 'week' || value === 'month' ? value : 'week'
}

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ zeitraum?: string; offset?: string }>
}) {
  const ctx = await getAppContext()
  const child = ctx.activeChild

  if (!child) {
    return (
      <EmptyState
        icon={Baby}
        title="Noch kein Kind angelegt"
        description="Auswertungen entstehen aus den Einträgen zu eurem Kind."
      />
    )
  }

  const params = await searchParams
  const period = parsePeriod(params.zeitraum)
  const offset = Math.min(0, Number(params.offset) || 0)

  const [stats, previous, heatmap] = await Promise.all([
    loadStats(child.id, period, ctx.timezone, offset),
    loadStats(child.id, period, ctx.timezone, offset - 1),
    loadSleepHeatmap(child.id, ctx.timezone, 30),
  ])

  // Erst ab vier offenen Faellen ist es ein Thema – einer davon ist meistens
  // nur ein Timer, den beide gestartet haben.
  const offeneDuplikateImZeitraum = await offeneDuplikate(child.id, {
    von: stats.from,
    bis: stats.to,
  })

  // Tagesschluessel der Heatmap, neueste zuletzt.
  const dayKeys: string[] = []
  for (let i = 29; i >= 0; i--) {
    dayKeys.push(localDateKey(addDays(heatmap.to, -1 - i, ctx.timezone), ctx.timezone))
  }

  return (
    <StatsView
      childName={child.name}
      period={period}
      offset={offset}
      periodDays={PERIOD_DAYS[period]}
      stats={{
        ...stats,
        from: stats.from.toISOString(),
        to: stats.to.toISOString(),
        daily: stats.daily.map((point) => ({ ...point, dayStart: point.dayStart.toISOString() })),
      }}
      heatmapCells={heatmap.cells}
      heatmapDays={dayKeys}
      childId={child.id}
      review={buildWeeklyReview(stats, previous, child.name)}
      offeneDuplikate={offeneDuplikateImZeitraum}
    />
  )
}
