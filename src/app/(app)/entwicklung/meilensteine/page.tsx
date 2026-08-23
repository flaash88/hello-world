import type { Metadata } from 'next'
import { Baby } from 'lucide-react'
import { getAppContext } from '@/lib/household'
import { prisma } from '@/lib/db'
import { ageInWeeks } from '@/lib/time'
import { correctedAgeDays } from '@/lib/sleep/windows'
import { MILESTONES } from '@/lib/content/milestones'
import { EmptyState } from '@/components/ui/empty-state'
import { BackLink } from '@/components/layout/back-link'
import { MilestoneList } from './milestone-list'

export const metadata: Metadata = { title: 'Meilensteine' }

export default async function MilestonesPage() {
  const ctx = await getAppContext()
  const child = ctx.activeChild

  if (!child?.birthDate) {
    return (
      <EmptyState
        icon={Baby}
        title="Noch kein Kind angelegt"
        description="Meilensteine gehören zu einem Kind mit Geburtsdatum."
      />
    )
  }

  const weeks = ageInWeeks(child.birthDate, new Date(), ctx.timezone)
  const correctedWeeks = Math.floor(
    correctedAgeDays(weeks * 7, child.birthDate, child.dueDate) / 7,
  )

  const saved = await prisma.milestone.findMany({
    where: { childId: child.id },
    orderBy: [{ achievedAt: 'desc' }, { createdAt: 'desc' }],
    include: { media: { select: { id: true, path: true, thumbPath: true } } },
  })

  return (
    <div className="flex flex-col gap-4">
      <BackLink href="/entwicklung" label="Entwicklung" />
      <h1 className="font-display text-2xl font-bold">Meilensteine</h1>
      <MilestoneList
        childId={child.id}
        currentWeek={correctedWeeks}
        templates={MILESTONES}
        saved={saved.map((milestone) => ({
          id: milestone.id,
          key: milestone.key,
          title: milestone.title,
          category: milestone.category,
          achievedAt: milestone.achievedAt?.toISOString() ?? null,
          note: milestone.note,
          photo: milestone.media
            ? {
                id: milestone.media.id,
                path: milestone.media.path,
                thumbPath: milestone.media.thumbPath ?? milestone.media.path,
                takenAt: null,
              }
            : null,
        }))}
      />
    </div>
  )
}
