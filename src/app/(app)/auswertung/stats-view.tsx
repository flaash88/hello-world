'use client'
import Link from 'next/link'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChevronLeft, ChevronRight, Droplets, Milk, Moon, Timer, TriangleAlert, Utensils } from 'lucide-react'
import type { DiaperStats, FeedingStats, HeatmapCell, SleepStats } from '@/lib/stats/aggregate'
import { PERIOD_LABEL, type Period } from '@/lib/stats/periods'
import { formatDateShort, formatDuration } from '@/lib/time'
import { formatVolume } from '@/lib/units'
import { useUnits } from '@/components/units-provider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { StatTile } from '@/components/stats/stat-tile'
import { SleepHeatmap } from '@/components/stats/sleep-heatmap'
import { WeeklyReviewCard } from '@/components/stats/weekly-review-card'
import { MedicalDisclaimer } from '@/components/medical-disclaimer'
import { cn } from '@/lib/utils'

type DailyPoint = {
  dayKey: string
  dayStart: string
  sleepMin: number
  nightSleepMin: number
  naps: number
  feeds: number
  bottleMl: number
  diapers: number
}

const CHART_STYLE = {
  background: 'hsl(var(--popover))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '0.75rem',
  fontSize: '0.8125rem',
}

export function StatsView({
  childName,
  period,
  offset,
  periodDays,
  stats,
  heatmapCells,
  heatmapDays,
  childId,
  review,
  offeneDuplikate,
}: {
  childName: string
  childId: string
  review: string[]
  /** Offene Verdachtsfaelle auf Doppelerfassung im gezeigten Zeitraum. */
  offeneDuplikate: number
  period: Period
  offset: number
  periodDays: number
  stats: {
    from: string
    to: string
    sleep: SleepStats
    feeding: FeedingStats
    diapers: DiaperStats
    daily: DailyPoint[]
    eventCount: number
  }
  heatmapCells: HeatmapCell[]
  heatmapDays: string[]
}) {
  const units = useUnits()
  const { sleep, feeding, diapers, daily } = stats
  const from = new Date(stats.from)
  const to = new Date(new Date(stats.to).getTime() - 1)

  const rangeLabel =
    periodDays === 1
      ? formatDateShort(from)
      : `${formatDateShort(from)} – ${formatDateShort(to)}`

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl font-bold">Auswertung</h1>

      <nav aria-label="Zeitraum">
        <ul className="flex gap-2">
          {(['day', 'week', 'month'] as Period[]).map((value) => (
            <li key={value} className="flex-1">
              <Link
                href={`/auswertung?zeitraum=${value}`}
                aria-current={period === value ? 'page' : undefined}
                className={cn(
                  'flex min-h-12 items-center justify-center rounded-xl border-2 text-sm font-semibold',
                  period === value ? 'border-primary bg-primary/10 text-primary' : 'border-border',
                )}
              >
                {PERIOD_LABEL[value]}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="flex items-center justify-between">
        <Link
          href={`/auswertung?zeitraum=${period}&offset=${offset - 1}`}
          aria-label="Früherer Zeitraum"
          className="flex size-12 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent"
        >
          <ChevronLeft className="size-5" aria-hidden />
        </Link>
        <span className="font-semibold">{rangeLabel}</span>
        {offset < 0 ? (
          <Link
            href={`/auswertung?zeitraum=${period}&offset=${offset + 1}`}
            aria-label="Späterer Zeitraum"
            className="flex size-12 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent"
          >
            <ChevronRight className="size-5" aria-hidden />
          </Link>
        ) : (
          <span className="size-12" aria-hidden />
        )}
      </div>

      {stats.eventCount === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Keine Einträge in diesem Zeitraum</CardTitle>
            <CardDescription>
              Für {childName} gibt es hier noch nichts auszuwerten.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          {offeneDuplikate > 3 && (
            <Link
              href="/duplikate"
              className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-accent"
            >
              <span>
                {offeneDuplikate} Einträge könnten doppelt sein und zählen gerade nicht in die
                Wachfenster-Berechnung.
              </span>
              <ChevronRight className="size-4 shrink-0" aria-hidden />
            </Link>
          )}

          {period === 'week' && <WeeklyReviewCard lines={review} childId={childId} />}

          <section>
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
              Schlaf
            </h2>
            <div className="grid grid-cols-2 gap-2">
              <StatTile
                icon={Moon}
                color="sleep"
                label="Gesamt"
                value={formatDuration(sleep.totalMin * 60, { short: true })}
                hint={periodDays > 1 ? `${formatDuration((sleep.totalMin / periodDays) * 60, { short: true })} pro Tag` : undefined}
              />
              <StatTile
                icon={Timer}
                color="sleep"
                label="Längster Block"
                value={formatDuration(sleep.longestBlockMin * 60, { short: true })}
              />
              <StatTile label="Nickerchen" value={String(sleep.naps)} hint={`${sleep.blocks} Schlafphasen`} />
              <StatTile
                label="Wachfenster"
                value={sleep.medianWakeWindowMin === null ? '–' : formatDuration(sleep.medianWakeWindowMin * 60, { short: true })}
                hint="Median"
              />
              <StatTile label="Nachtwachen" value={String(sleep.wakeCount)} />
              <StatTile
                label="Einschlafdauer"
                value={sleep.avgFallAsleepMin === null ? '–' : `${sleep.avgFallAsleepMin} min`}
                hint="Durchschnitt"
              />
            </div>
          </section>

          {daily.length > 2 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Schlaf pro Tag</CardTitle>
                <CardDescription>Gesamt und davon nachts</CardDescription>
              </CardHeader>
              <CardContent className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={daily} margin={{ top: 4, right: 8, bottom: 4, left: -24 }}>
                    <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                    <XAxis
                      dataKey="dayKey"
                      tickFormatter={(value: string) => value.slice(8)}
                      tick={{ fontSize: 11 }}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <YAxis
                      tickFormatter={(value: number) => `${Math.round(value / 60)}h`}
                      tick={{ fontSize: 11 }}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <Tooltip
                      contentStyle={CHART_STYLE}
                      formatter={(value) => formatDuration(Number(value) * 60, { short: true })}
                    />
                    <Line type="monotone" dataKey="sleepMin" name="Gesamt" stroke="hsl(var(--cat-sleep))" strokeWidth={2.5} dot={false} />
                    <Line type="monotone" dataKey="nightSleepMin" name="Nachts" stroke="hsl(var(--primary))" strokeWidth={2} strokeDasharray="4 3" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          <section>
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
              Fütterung
            </h2>
            <div className="grid grid-cols-2 gap-2">
              <StatTile icon={Utensils} color="feed" label="Mahlzeiten" value={String(feeding.mealCount)} />
              <StatTile
                label="Abstand"
                value={feeding.medianIntervalMin === null ? '–' : formatDuration(feeding.medianIntervalMin * 60, { short: true })}
                hint="Median"
              />
              <StatTile label="Stillen" value={String(feeding.nursingCount)} hint={formatDuration(feeding.nursingMin * 60, { short: true })} />
              <StatTile icon={Milk} color="bottle" label="Flasche" value={formatVolume(feeding.bottleMl, units)} hint={`${feeding.bottleCount} Flaschen`} />
              <StatTile label="Abgepumpt" value={formatVolume(feeding.pumpingMl, units)} hint={`${feeding.pumpingCount} Einheiten`} />
              <StatTile label="Beikost" value={String(feeding.solidsCount)} />
            </div>
          </section>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Verteilung über den Tag</CardTitle>
            </CardHeader>
            <CardContent className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={feeding.byDaypart} margin={{ top: 4, right: 8, bottom: 4, left: -28 }}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tickFormatter={(value: string) => value.split(' ')[0] ?? value}
                    tick={{ fontSize: 11 }}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={CHART_STYLE} />
                  <Bar dataKey="count" name="Mahlzeiten" fill="hsl(var(--cat-feed))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <section>
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
              Windeln
            </h2>
            <div className="grid grid-cols-2 gap-2">
              <StatTile icon={Droplets} color="diaper" label="Gesamt" value={String(diapers.total)} hint={diapers.perDay !== null ? `${diapers.perDay} pro Tag` : undefined} />
              <StatTile label="Nass" value={String(diapers.wet)} />
              <StatTile label="Voll" value={String(diapers.dirty)} />
              <StatTile label="Beides" value={String(diapers.both)} />
            </div>
            {diapers.notable.length > 0 && (
              <p className="mt-2 flex items-start gap-2 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span>
                  In diesem Zeitraum{' '}
                  {diapers.notable
                    .map((entry) => `${entry.count}× ${entry.color === 'red' ? 'rötlich' : 'weißlich oder grau'}`)
                    .join(', ')}{' '}
                  eingetragen. Das gehört ärztlich abgeklärt.
                </span>
              </p>
            )}
          </section>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Schlaf über 30 Tage</CardTitle>
              <CardDescription>Je dunkler, desto mehr Schlaf in dieser Stunde</CardDescription>
            </CardHeader>
            <CardContent>
              <SleepHeatmap cells={heatmapCells} dayKeys={heatmapDays} />
            </CardContent>
          </Card>

          <MedicalDisclaimer>
            Alle Zahlen beschreiben, was ihr eingetragen habt – nicht mehr und nicht weniger.
            Vergessene Einträge verschieben die Statistik.
          </MedicalDisclaimer>
        </>
      )}
    </div>
  )
}
