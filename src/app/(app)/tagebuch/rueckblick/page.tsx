import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Baby, Printer } from 'lucide-react'
import { getAppContext } from '@/lib/household'
import { prisma } from '@/lib/db'
import { addDays, formatAge, formatDateLong, startOfLocalDay } from '@/lib/time'
import { formatLength, formatWeight, unitPrefsFrom } from '@/lib/units'
import { dauerText } from '@/lib/audio/notes'
import { EmptyState } from '@/components/ui/empty-state'
import { BackLink } from '@/components/layout/back-link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export const metadata: Metadata = { title: 'Rückblick' }

export default async function YearReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ jahr?: string }>
}) {
  const ctx = await getAppContext()
  const units = unitPrefsFrom(ctx.household.settings)
  const child = ctx.activeChild

  if (!child) {
    return (
      <EmptyState
        icon={Baby}
        title="Noch kein Kind angelegt"
        description="Der Rückblick sammelt, was ihr über euer Kind aufgeschrieben habt."
      />
    )
  }

  const params = await searchParams
  const year = Number(params.jahr) || new Date().getFullYear()
  const from = startOfLocalDay(new Date(Date.UTC(year, 0, 1, 12)), ctx.timezone)
  const to = addDays(startOfLocalDay(new Date(Date.UTC(year + 1, 0, 1, 12)), ctx.timezone), 0, ctx.timezone)

  const [entries, milestones, measurements, toene] = await Promise.all([
    prisma.journalEntry.findMany({
      where: { childId: child.id, happenedAt: { gte: from, lt: to } },
      include: { media: { take: 3 } },
      orderBy: { happenedAt: 'asc' },
    }),
    prisma.milestone.findMany({
      where: { childId: child.id, achievedAt: { gte: from, lt: to } },
      orderBy: { achievedAt: 'asc' },
    }),
    prisma.growthMeasurement.findMany({
      where: { childId: child.id, measuredAt: { gte: from, lt: to } },
      orderBy: { measuredAt: 'asc' },
    }),
    prisma.audioNote.findMany({
      where: { childId: child.id, recordedAt: { gte: from, lt: to } },
      orderBy: { recordedAt: 'asc' },
      select: { id: true, title: true, recordedAt: true, durationSec: true },
    }),
  ])

  const first = measurements[0]
  const last = measurements[measurements.length - 1]

  return (
    <div className="flex flex-col gap-4">
      <div className="print:hidden">
        <BackLink href="/tagebuch" label="Tagebuch" />
      </div>

      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl font-bold">
            {child.name} · {year}
          </h1>
          {child.birthDate && (
            <p className="text-muted-foreground">
              Am Jahresende {formatAge(child.birthDate, new Date(Date.UTC(year, 11, 31)), ctx.timezone)}
            </p>
          )}
        </div>
        <PrintHint />
      </div>

      {entries.length === 0 && milestones.length === 0 && toene.length === 0 ? (
        <EmptyState
          icon={Baby}
          title={`Für ${year} gibt es noch nichts`}
          description="Sobald ihr Einträge oder Meilensteine erfasst, entsteht hier der Rückblick."
        />
      ) : (
        <>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Das Jahr in Zahlen</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <Stat label="Tagebucheinträge" value={String(entries.length)} />
              <Stat label="Meilensteine" value={String(milestones.length)} />
              <Stat label="Aufnahmen" value={String(toene.length)} />
              <Stat
                label="Fotos"
                value={String(entries.reduce((sum, entry) => sum + entry.media.length, 0))}
              />
              {first && last && first.weightKg !== null && last.weightKg !== null && (
                <Stat
                  label="Gewicht"
                  value={`+${formatWeight(last.weightKg - first.weightKg, units)}`}
                />
              )}
              {first && last && first.lengthCm !== null && last.lengthCm !== null && (
                <Stat
                  label="Gewachsen"
                  value={`+${formatLength(last.lengthCm - first.lengthCm, units)}`}
                />
              )}
            </CardContent>
          </Card>

          {milestones.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Was {child.name} gelernt hat</CardTitle>
                <CardDescription>{milestones.length} Meilensteine in diesem Jahr</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-2">
                  {milestones.map((milestone) => (
                    <li key={milestone.id} className="flex items-baseline justify-between gap-3">
                      <span className="font-semibold">{milestone.title}</span>
                      <span className="shrink-0 text-sm text-muted-foreground">
                        {milestone.achievedAt && formatDateLong(milestone.achievedAt, ctx.timezone)}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {toene.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Wie {child.name} geklungen hat</CardTitle>
                <CardDescription>
                  {toene.length} {toene.length === 1 ? 'Aufnahme' : 'Aufnahmen'} in diesem Jahr
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-2">
                  {toene.map((ton) => (
                    <li key={ton.id}>
                      <Link
                        href="/tagebuch/toene"
                        className="flex items-baseline justify-between gap-3"
                      >
                        <span className="font-semibold">{ton.title}</span>
                        <span className="shrink-0 text-sm text-muted-foreground">
                          {formatDateLong(ton.recordedAt, ctx.timezone)} ·{' '}
                          {dauerText(ton.durationSec)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <section>
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
              Aus dem Tagebuch
            </h2>
            <ul className="flex flex-col gap-3">
              {entries.map((entry) => (
                <li key={entry.id}>
                  <Card>
                    <CardContent className="flex flex-col gap-2 p-4">
                      <p className="text-sm text-muted-foreground">
                        {formatDateLong(entry.happenedAt, ctx.timezone)}
                      </p>
                      {entry.title && (
                        <h3 className="font-display text-lg font-semibold">{entry.title}</h3>
                      )}
                      {entry.media.length > 0 && (
                        <ul className="grid grid-cols-3 gap-1.5">
                          {entry.media.map((photo) => (
                            <li key={photo.id}>
                              <Image
                                src={`/api/uploads/${photo.thumbPath ?? photo.path}`}
                                alt=""
                                width={320}
                                height={320}
                                className="aspect-square w-full rounded-lg object-cover"
                                unoptimized
                              />
                            </li>
                          ))}
                        </ul>
                      )}
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">{entry.body}</p>
                      {entry.monthPhoto !== null && <Badge>Monatsfoto {entry.monthPhoto}</Badge>}
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="tabular font-display text-xl font-bold">{value}</p>
    </div>
  )
}

function PrintHint() {
  return (
    <p className="flex items-center gap-1.5 text-xs text-muted-foreground print:hidden">
      <Printer className="size-4" aria-hidden />
      Über das Browser-Menü als PDF drucken
    </p>
  )
}
