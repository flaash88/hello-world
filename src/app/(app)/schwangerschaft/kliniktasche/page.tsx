import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getAppContext } from '@/lib/household'
import { prisma } from '@/lib/db'
import { ensureHospitalBag } from '@/lib/pregnancy/seed'
import { HOSPITAL_BAG_SECTIONS } from '@/lib/pregnancy/hospital-bag'
import { BackLink } from '@/components/layout/back-link'
import { HospitalBag } from './hospital-bag'

export const metadata: Metadata = { title: 'Kliniktasche' }

export default async function HospitalBagPage() {
  const ctx = await getAppContext()
  if (!ctx.pregnancy) redirect('/onboarding')

  await ensureHospitalBag(ctx.household.id, ctx.pregnancy.id)

  const items = await prisma.checklistItem.findMany({
    where: { householdId: ctx.household.id, listKey: 'hospitalbag' },
    orderBy: { sortOrder: 'asc' },
  })
  const members = new Map(ctx.members.map((m) => [m.id, m]))

  return (
    <div className="flex flex-col gap-4">
      <BackLink href="/schwangerschaft" label="Schwangerschaft" />
      <h1 className="font-display text-2xl font-bold">Kliniktasche</h1>
      <HospitalBag
        sections={[...HOSPITAL_BAG_SECTIONS]}
        items={items.map((item) => ({
          id: item.id,
          section: item.section,
          label: item.label,
          note: item.note,
          quantity: item.quantity,
          done: item.done,
          custom: item.custom,
          doneBy: item.doneById ? (members.get(item.doneById) ?? null) : null,
        }))}
      />
    </div>
  )
}
