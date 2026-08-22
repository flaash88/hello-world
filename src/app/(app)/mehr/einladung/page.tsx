import type { Metadata } from 'next'
import { getAppContext } from '@/lib/household'
import { prisma } from '@/lib/db'
import { InviteManager } from './invite-manager'
import { BackLink } from '@/components/layout/back-link'

export const metadata: Metadata = { title: 'Einladung' }

export default async function InvitePage() {
  const ctx = await getAppContext()
  const open = await prisma.invite.findMany({
    where: { householdId: ctx.household.id, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
    select: { id: true, label: true, createdAt: true, expiresAt: true },
  })

  return (
    <div className="flex flex-col gap-4">
      <BackLink href="/mehr" label="Mehr" />
      <h1 className="font-display text-2xl font-bold">Zweite Person einladen</h1>
      <p className="text-muted-foreground">
        Der Code gilt 14 Tage und lässt sich genau einmal einlösen. Gib ihn direkt weiter –
        nicht über einen Messenger, wenn es sich vermeiden lässt.
      </p>
      <InviteManager
        openInvites={open.map((i) => ({
          id: i.id,
          label: i.label,
          createdAt: i.createdAt.toISOString(),
          expiresAt: i.expiresAt.toISOString(),
        }))}
      />
    </div>
  )
}
