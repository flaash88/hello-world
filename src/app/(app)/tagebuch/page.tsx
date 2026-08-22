import type { Metadata } from 'next'
import Link from 'next/link'
import { Baby, CalendarRange, Images } from 'lucide-react'
import { getAppContext } from '@/lib/household'
import { prisma } from '@/lib/db'
import { knownJournalTagsAction } from '@/lib/actions/journal'
import { ageInMonths } from '@/lib/time'
import { EmptyState } from '@/components/ui/empty-state'
import { JournalTimeline } from './journal-timeline'

export const metadata: Metadata = { title: 'Tagebuch' }

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string; monat?: string }>
}) {
  const ctx = await getAppContext()
  const child = ctx.activeChild

  if (!child) {
    return (
      <EmptyState
        icon={Baby}
        title="Noch kein Kind angelegt"
        description="Das Tagebuch gehört zu einem Kind."
      />
    )
  }

  const params = await searchParams
  const tagFilter = params.tag?.trim() || null
  const monthFilter = params.monat?.trim() || null

  const entries = await prisma.journalEntry.findMany({
    where: {
      childId: child.id,
      ...(tagFilter ? { tags: { array_contains: [tagFilter] } } : {}),
    },
    include: { media: true },
    orderBy: { happenedAt: 'desc' },
    take: 200,
  })

  const members = new Map(ctx.members.map((member) => [member.id, member]))
  const tags = await knownJournalTagsAction(child.id)

  // Nach Monat filtern wird in der Anzeige gemacht, damit der Filter auch bei
  // Einträgen ohne Tag greift.
  const filtered = monthFilter
    ? entries.filter((entry) => entry.happenedAt.toISOString().slice(0, 7) === monthFilter)
    : entries

  const currentMonth = child.birthDate ? ageInMonths(child.birthDate, new Date(), ctx.timezone) : null

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <h1 className="font-display text-2xl font-bold">Tagebuch</h1>
        <div className="flex gap-1">
          <Link
            href="/tagebuch/monatsfotos"
            aria-label="Monatsfotos"
            className="flex size-12 items-center justify-center rounded-lg border border-border"
          >
            <Images className="size-5" aria-hidden />
          </Link>
          <Link
            href="/tagebuch/rueckblick"
            aria-label="Jahresrückblick"
            className="flex size-12 items-center justify-center rounded-lg border border-border"
          >
            <CalendarRange className="size-5" aria-hidden />
          </Link>
        </div>
      </div>

      <JournalTimeline
        childId={child.id}
        childName={child.name}
        currentMonth={currentMonth}
        knownTags={tags}
        activeTag={tagFilter}
        activeMonth={monthFilter}
        availableMonths={[
          ...new Set(entries.map((entry) => entry.happenedAt.toISOString().slice(0, 7))),
        ].sort((a, b) => b.localeCompare(a))}
        entries={filtered.map((entry) => ({
          id: entry.id,
          happenedAt: entry.happenedAt.toISOString(),
          title: entry.title,
          body: entry.body,
          tags: entry.tags as string[],
          mood: entry.mood,
          monthPhoto: entry.monthPhoto,
          createdBy: members.get(entry.createdById) ?? null,
          media: entry.media.map((asset) => ({
            id: asset.id,
            path: asset.path,
            thumbPath: asset.thumbPath ?? asset.path,
            takenAt: asset.takenAt?.toISOString() ?? null,
          })),
        }))}
      />
    </div>
  )
}
