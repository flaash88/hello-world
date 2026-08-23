import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getAppContext } from '@/lib/household'
import { prisma } from '@/lib/db'
import { BackLink } from '@/components/layout/back-link'
import { ContractionTimer } from './contraction-timer'

export const metadata: Metadata = { title: 'Wehen-Timer' }

export default async function ContractionPage() {
  const ctx = await getAppContext()
  if (!ctx.pregnancy) redirect('/onboarding')

  // Die letzten 12 Stunden reichen fuer die Auswertung und die Verlaufsliste.
  const since = new Date(Date.now() - 12 * 3600_000)
  const contractions = await prisma.contraction.findMany({
    where: { pregnancyId: ctx.pregnancy.id, startedAt: { gte: since } },
    orderBy: { startedAt: 'desc' },
    take: 200,
  })

  const members = new Map(ctx.members.map((m) => [m.id, m]))

  return (
    <div className="flex flex-col gap-4">
      <BackLink href="/schwangerschaft" label="Schwangerschaft" />
      <h1 className="font-display text-2xl font-bold">Wehen-Timer</h1>
      <ContractionTimer
        initial={contractions.map((c) => ({
          id: c.id,
          startedAt: c.startedAt.toISOString(),
          endedAt: c.endedAt?.toISOString() ?? null,
          intensity: c.intensity,
          createdBy: members.get(c.createdById) ?? null,
        }))}
      />
    </div>
  )
}
