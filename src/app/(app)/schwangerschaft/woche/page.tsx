import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getAppContext } from '@/lib/household'
import { gestationalAge } from '@/lib/pregnancy/weeks'
import { PREGNANCY_WEEKS } from '@/lib/pregnancy/content'
import { BackLink } from '@/components/layout/back-link'
import { WeekBrowser } from './week-browser'

export const metadata: Metadata = { title: 'Woche für Woche' }

export default async function WeekPage({
  searchParams,
}: {
  searchParams: Promise<{ w?: string }>
}) {
  const ctx = await getAppContext()
  if (!ctx.pregnancy) redirect('/onboarding')

  const age = gestationalAge(ctx.pregnancy.dueDate, new Date(), ctx.timezone)
  const params = await searchParams
  const requested = Number(params.w)
  const initialWeek = Number.isFinite(requested) ? requested : age.week

  return (
    <div className="flex flex-col gap-4">
      <BackLink href="/schwangerschaft" label="Schwangerschaft" />
      <h1 className="font-display text-2xl font-bold">Woche für Woche</h1>
      <WeekBrowser weeks={PREGNANCY_WEEKS} currentWeek={age.week} initialWeek={initialWeek} />
    </div>
  )
}
