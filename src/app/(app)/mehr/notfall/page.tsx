import type { Metadata } from 'next'
import { Baby } from 'lucide-react'
import { getAppContext } from '@/lib/household'
import { prisma } from '@/lib/db'
import { istKontaktRolle, type KontaktRolle } from '@/lib/emergency/card'
import { BackLink } from '@/components/layout/back-link'
import { EmptyState } from '@/components/ui/empty-state'
import { NotfallEinstellungen } from './notfall-einstellungen'

export const metadata: Metadata = { title: 'Notfalldaten' }

export default async function NotfallSettingsPage() {
  const ctx = await getAppContext()
  const child = ctx.activeChild

  if (!child) {
    return (
      <EmptyState
        icon={Baby}
        title="Noch kein Kind angelegt"
        description="Die Notfallkarte gehört zu einem Kind – leg zuerst eines an."
      />
    )
  }

  const kontakte = await prisma.emergencyContact.findMany({
    where: { householdId: ctx.household.id },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  })

  return (
    <div className="flex flex-col gap-4">
      <BackLink href="/mehr" label="Mehr" />
      <h1 className="font-display text-2xl font-bold">Notfalldaten</h1>
      <NotfallEinstellungen
        childId={child.id}
        childName={child.name}
        blutgruppe={child.bloodGroup ?? ''}
        vorerkrankungen={child.conditions ?? ''}
        adresse={ctx.household.settings?.emergencyAddress ?? ''}
        kontakte={kontakte.map((kontakt) => ({
          id: kontakt.id,
          rolle: (istKontaktRolle(kontakt.role) ? kontakt.role : 'frei') as KontaktRolle,
          name: kontakt.name,
          nummer: kontakt.phone,
        }))}
      />
    </div>
  )
}
