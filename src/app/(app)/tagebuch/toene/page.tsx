import type { Metadata } from 'next'
import { Baby } from 'lucide-react'
import { getAppContext } from '@/lib/household'
import { prisma } from '@/lib/db'
import { formatDateTime } from '@/lib/time'
import { normalisiereTags } from '@/lib/audio/notes'
import { ffmpegVorhanden } from '@/lib/audio/transcode'
import { BackLink } from '@/components/layout/back-link'
import { EmptyState } from '@/components/ui/empty-state'
import { ToeneAnsicht } from './toene-ansicht'
import type { TonView } from './types'

export const metadata: Metadata = { title: 'Töne' }

export default async function ToenePage() {
  const ctx = await getAppContext()
  const child = ctx.activeChild

  if (!child) {
    return (
      <EmptyState
        icon={Baby}
        title="Noch kein Kind angelegt"
        description="Die Tonspuren gehören zu einem Kind – leg zuerst eines an."
      />
    )
  }

  const [rows, meilensteine, ffmpeg] = await Promise.all([
    prisma.audioNote.findMany({
      where: { childId: child.id },
      orderBy: { recordedAt: 'desc' },
      include: { createdBy: { select: { displayName: true, initials: true, color: true } } },
    }),
    prisma.milestone.findMany({
      where: { childId: child.id },
      orderBy: [{ achievedAt: 'desc' }, { createdAt: 'desc' }],
      select: { id: true, title: true },
      take: 100,
    }),
    ffmpegVorhanden(),
  ])

  const milestoneTitel = new Map(meilensteine.map((m) => [m.id, m.title]))

  const toene: TonView[] = rows.map((row) => ({
    id: row.id,
    title: row.title,
    recordedAt: row.recordedAt.toISOString(),
    recordedAtText: formatDateTime(row.recordedAt, ctx.timezone),
    durationSec: row.durationSec,
    bytes: row.bytes,
    peaks: Array.isArray(row.peaks) ? (row.peaks as number[]) : [],
    tags: normalisiereTags(row.tags),
    milestoneId: row.milestoneId,
    milestoneTitle: row.milestoneId ? (milestoneTitel.get(row.milestoneId) ?? null) : null,
    src: `/api/uploads/${row.path}`,
    createdBy: row.createdBy,
  }))

  return (
    <div className="flex flex-col gap-4">
      <BackLink href="/tagebuch" label="Tagebuch" />
      <ToeneAnsicht
        childId={child.id}
        childName={child.name}
        toene={toene}
        meilensteine={meilensteine}
        ffmpegVorhanden={ffmpeg}
      />
    </div>
  )
}
