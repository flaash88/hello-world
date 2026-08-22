import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getAppContext } from '@/lib/household'
import { prisma } from '@/lib/db'
import { BackLink } from '@/components/layout/back-link'
import { KickCounter } from './kick-counter'

export const metadata: Metadata = { title: 'Kindsbewegungen' }

export default async function KicksPage() {
  const ctx = await getAppContext()
  if (!ctx.pregnancy) redirect('/onboarding')

  const sessions = await prisma.kickSession.findMany({
    where: { pregnancyId: ctx.pregnancy.id },
    orderBy: { startedAt: 'desc' },
    take: 14,
  })

  const open = sessions.find(
    (s) => s.endedAt === null && s.startedAt.getTime() > Date.now() - 2 * 3600_000,
  )

  return (
    <div className="flex flex-col gap-4">
      <BackLink href="/schwangerschaft" label="Schwangerschaft" />
      <h1 className="font-display text-2xl font-bold">Kindsbewegungen</h1>
      <KickCounter
        openSession={
          open ? { id: open.id, startedAt: open.startedAt.toISOString(), count: open.count } : null
        }
        history={sessions
          .filter((s) => s.endedAt !== null)
          .map((s) => ({
            id: s.id,
            startedAt: s.startedAt.toISOString(),
            endedAt: s.endedAt!.toISOString(),
            count: s.count,
          }))}
      />
    </div>
  )
}
