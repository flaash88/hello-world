import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getAppContext } from '@/lib/household'
import { prisma } from '@/lib/db'
import { BackLink } from '@/components/layout/back-link'
import { NameVoting } from './name-voting'

export const metadata: Metadata = { title: 'Namensliste' }

export default async function NamesPage() {
  const ctx = await getAppContext()
  if (!ctx.pregnancy) redirect('/onboarding')

  const suggestions = await prisma.nameSuggestion.findMany({
    where: { pregnancyId: ctx.pregnancy.id },
    include: { votes: true },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="flex flex-col gap-4">
      <BackLink href="/schwangerschaft" label="Schwangerschaft" />
      <h1 className="font-display text-2xl font-bold">Namensliste</h1>
      <NameVoting
        currentUserId={ctx.user.id}
        memberCount={ctx.members.length}
        members={ctx.members}
        suggestions={suggestions.map((s) => ({
          id: s.id,
          name: s.name,
          sex: s.sex,
          note: s.note,
          createdById: s.createdById,
          votes: s.votes.map((v) => ({ userId: v.userId, vote: v.vote })),
        }))}
      />
    </div>
  )
}
