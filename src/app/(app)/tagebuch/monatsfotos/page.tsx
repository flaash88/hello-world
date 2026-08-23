import type { Metadata } from 'next'
import Image from 'next/image'
import { Baby, Images } from 'lucide-react'
import { getAppContext } from '@/lib/household'
import { prisma } from '@/lib/db'
import { ageInMonths, formatDateShort } from '@/lib/time'
import { EmptyState } from '@/components/ui/empty-state'
import { BackLink } from '@/components/layout/back-link'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Monatsfotos' }

export default async function MonthPhotosPage() {
  const ctx = await getAppContext()
  const child = ctx.activeChild

  if (!child?.birthDate) {
    return (
      <EmptyState
        icon={Baby}
        title="Noch kein Geburtsdatum hinterlegt"
        description="Die Monatsfotos richten sich nach dem Lebensmonat."
      />
    )
  }

  const entries = await prisma.journalEntry.findMany({
    where: { childId: child.id, monthPhoto: { not: null } },
    include: { media: { take: 1 } },
    orderBy: { monthPhoto: 'asc' },
  })

  const currentMonth = ageInMonths(child.birthDate, new Date(), ctx.timezone)
  const byMonth = new Map(entries.map((entry) => [entry.monthPhoto!, entry]))
  // Bis zum aktuellen Monat, mindestens aber die ersten zwölf zeigen.
  const months = Array.from({ length: Math.max(12, currentMonth + 1) }, (_, month) => month)

  return (
    <div className="flex flex-col gap-4">
      <BackLink href="/tagebuch" label="Tagebuch" />
      <h1 className="font-display text-2xl font-bold">Monatsfotos</h1>
      <p className="text-muted-foreground">
        Ein Bild pro Lebensmonat. Markiere ein Foto im Tagebuch als Monatsfoto, dann erscheint es
        hier.
      </p>

      {entries.length === 0 ? (
        <EmptyState
          icon={Images}
          title="Noch kein Monatsfoto"
          description="Beim Schreiben eines Tagebucheintrags lässt sich ein Foto als Monatsfoto markieren."
        />
      ) : (
        <ul className="grid grid-cols-3 gap-2">
          {months.map((month) => {
            const entry = byMonth.get(month)
            const photo = entry?.media[0]
            return (
              <li key={month} className="relative">
                <div
                  className={cn(
                    'flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl border-2',
                    photo ? 'border-border' : 'border-dashed border-border bg-muted/40',
                  )}
                >
                  {photo ? (
                    <Image
                      src={`/api/uploads/${photo.thumbPath ?? photo.path}`}
                      alt={`Monat ${month}`}
                      width={320}
                      height={320}
                      className="size-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {month <= currentMonth ? 'fehlt' : ''}
                    </span>
                  )}
                </div>
                <span className="absolute left-1.5 top-1.5 rounded-full bg-background/90 px-2 py-0.5 text-xs font-bold tabular">
                  {month}
                </span>
                {entry && (
                  <span className="mt-1 block text-center text-[0.625rem] text-muted-foreground">
                    {formatDateShort(entry.happenedAt, ctx.timezone)}
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
