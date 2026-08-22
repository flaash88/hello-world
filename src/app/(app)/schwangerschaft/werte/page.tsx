import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getAppContext } from '@/lib/household'
import { prisma } from '@/lib/db'
import { BackLink } from '@/components/layout/back-link'
import { MaternalLogView } from './maternal-log-view'

export const metadata: Metadata = { title: 'Werte & Symptome' }

export default async function MaternalPage() {
  const ctx = await getAppContext()
  if (!ctx.pregnancy) redirect('/onboarding')

  const logs = await prisma.maternalLog.findMany({
    where: { pregnancyId: ctx.pregnancy.id },
    orderBy: { recordedAt: 'desc' },
    take: 120,
  })
  const members = new Map(ctx.members.map((m) => [m.id, m]))

  return (
    <div className="flex flex-col gap-4">
      <BackLink href="/schwangerschaft" label="Schwangerschaft" />
      <h1 className="font-display text-2xl font-bold">Gewicht, Blutdruck, Symptome</h1>
      <MaternalLogView
        logs={logs.map((log) => ({
          id: log.id,
          recordedAt: log.recordedAt.toISOString(),
          weightKg: log.weightKg,
          systolic: log.systolic,
          diastolic: log.diastolic,
          pulse: log.pulse,
          symptoms: log.symptoms as string[],
          note: log.note,
          createdBy: members.get(log.createdById) ?? null,
        }))}
      />
    </div>
  )
}
