'use client'
import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { EVENT_CATEGORIES, type EventType } from '@/lib/events/types'
import { arcPath, minuteLabel, polarPoint, type DaySegment } from '@/lib/dashboard/day-segments'
import { formatDuration } from '@/lib/time'
import { cn } from '@/lib/utils'

const SIZE = 300
const CENTER = SIZE / 2

/** Jede Kategorie bekommt ihren eigenen Ring – so ueberlagert sich nichts. */
const RINGS: { types: EventType[]; outer: number; inner: number }[] = [
  { types: ['sleep'], outer: 140, inner: 112 },
  { types: ['nursing', 'bottle', 'solids', 'pumping'], outer: 108, inner: 86 },
  { types: ['diaper'], outer: 82, inner: 66 },
  { types: ['mood', 'health', 'other'], outer: 62, inner: 50 },
]

export type PlannedWindow = { fromMin: number; toMin: number; label: string }

/**
 * 24-Stunden-Kreisuhr als Hauptdashboard. Mitternacht oben, Mittag unten.
 * Antippbar fuer Details, wischbar fuer Vortage.
 */
export function DayClock({
  segments,
  planned,
  nowMinutes,
  dayOffset,
  onDayOffsetChange,
  dayLabel,
  canGoForward,
}: {
  segments: DaySegment[]
  planned?: PlannedWindow | null
  nowMinutes: number | null
  dayOffset: number
  onDayOffsetChange: (offset: number) => void
  dayLabel: string
  canGoForward: boolean
}) {
  const [selected, setSelected] = useState<DaySegment | null>(null)
  const [touchStartX, setTouchStartX] = useState<number | null>(null)

  const rings = useMemo(
    () =>
      RINGS.map((ring) => ({
        ...ring,
        items: segments.filter((segment) => ring.types.includes(segment.type as EventType)),
      })),
    [segments],
  )

  const hourTicks = Array.from({ length: 24 }, (_, hour) => hour * 60)

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex w-full items-center justify-between">
        <button
          type="button"
          onClick={() => onDayOffsetChange(dayOffset - 1)}
          aria-label="Vorheriger Tag"
          className="flex size-12 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent"
        >
          <ChevronLeft className="size-5" aria-hidden />
        </button>
        <span className="font-display text-lg font-semibold">{dayLabel}</span>
        <button
          type="button"
          onClick={() => onDayOffsetChange(dayOffset + 1)}
          disabled={!canGoForward}
          aria-label="Nächster Tag"
          className="flex size-12 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent disabled:opacity-30"
        >
          <ChevronRight className="size-5" aria-hidden />
        </button>
      </div>

      <div
        onTouchStart={(event) => setTouchStartX(event.touches[0]?.clientX ?? null)}
        onTouchEnd={(event) => {
          if (touchStartX === null) return
          const delta = (event.changedTouches[0]?.clientX ?? touchStartX) - touchStartX
          // Wischen nach rechts = ein Tag zurück.
          if (delta > 60) onDayOffsetChange(dayOffset - 1)
          else if (delta < -60 && canGoForward) onDayOffsetChange(dayOffset + 1)
          setTouchStartX(null)
        }}
      >
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="w-full max-w-[320px]"
          role="img"
          aria-label={`Tagesübersicht für ${dayLabel} mit ${segments.length} Einträgen`}
        >
          <defs>
            <pattern id="geplant" width="6" height="6" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
              <rect width="6" height="6" fill="hsl(var(--muted))" />
              <line x1="0" y1="0" x2="0" y2="6" stroke="hsl(var(--primary))" strokeWidth="2" opacity="0.6" />
            </pattern>
          </defs>

          {/* Grundscheibe und Stundenraster */}
          <circle cx={CENTER} cy={CENTER} r={144} fill="hsl(var(--muted))" opacity={0.4} />
          {hourTicks.map((minute) => {
            const major = minute % 360 === 0
            const outer = polarPoint(minute, 146, CENTER)
            const inner = polarPoint(minute, major ? 132 : 140, CENTER)
            return (
              <line
                key={minute}
                x1={inner.x}
                y1={inner.y}
                x2={outer.x}
                y2={outer.y}
                stroke="hsl(var(--border))"
                strokeWidth={major ? 2 : 1}
              />
            )
          })}
          {[0, 360, 720, 1080].map((minute) => {
            const point = polarPoint(minute, 158, CENTER)
            return (
              <text
                key={minute}
                x={point.x}
                y={point.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-muted-foreground text-[10px] font-semibold"
              >
                {minuteLabel(minute)}
              </text>
            )
          })}

          {/* Geplantes Schlaffenster als schraffierter Bereich */}
          {planned && (
            <path
              d={arcPath(planned.fromMin, planned.toMin, 112, 140, CENTER)}
              fill="url(#geplant)"
              opacity={0.85}
            >
              <title>{planned.label}</title>
            </path>
          )}

          {/* Eintraege je Ring */}
          {rings.map((ring) =>
            ring.items.map((segment) => {
              const category = EVENT_CATEGORIES[segment.type as EventType]
              return (
                <path
                  key={segment.id}
                  d={arcPath(segment.fromMin, segment.toMin, ring.inner, ring.outer, CENTER)}
                  fill={`hsl(var(--cat-${category?.color ?? 'other'}))`}
                  opacity={segment.running ? 0.75 : 1}
                  stroke={selected?.id === segment.id ? 'hsl(var(--foreground))' : 'none'}
                  strokeWidth={selected?.id === segment.id ? 2 : 0}
                  className="cursor-pointer"
                  onClick={() => setSelected(segment)}
                >
                  <title>{segment.label}</title>
                </path>
              )
            }),
          )}

          {/* Zeiger fuer Jetzt */}
          {nowMinutes !== null && (
            <>
              <line
                x1={CENTER}
                y1={CENTER}
                x2={polarPoint(nowMinutes, 148, CENTER).x}
                y2={polarPoint(nowMinutes, 148, CENTER).y}
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                strokeLinecap="round"
              />
              <circle
                cx={polarPoint(nowMinutes, 148, CENTER).x}
                cy={polarPoint(nowMinutes, 148, CENTER).y}
                r={4}
                fill="hsl(var(--primary))"
              />
            </>
          )}

          <circle cx={CENTER} cy={CENTER} r={44} fill="hsl(var(--card))" />
        </svg>
      </div>

      <div
        aria-live="polite"
        className={cn(
          'min-h-14 w-full rounded-xl px-3 py-2 text-center',
          selected ? 'bg-accent' : 'bg-transparent',
        )}
      >
        {selected ? (
          <p className="text-sm">
            <span className="font-semibold">{selected.label}</span>
            <span className="text-muted-foreground">
              {' · '}
              {minuteLabel(selected.fromMin)}
              {!selected.isPoint && ` – ${minuteLabel(selected.toMin)}`}
              {!selected.isPoint &&
                ` · ${formatDuration((selected.toMin - selected.fromMin) * 60, { short: true })}`}
            </span>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            {segments.length === 0
              ? 'Für diesen Tag gibt es noch keine Einträge.'
              : 'Tippe auf ein Segment für Details, wische für andere Tage.'}
          </p>
        )}
      </div>

      <ul className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {(['sleep', 'nursing', 'bottle', 'solids', 'diaper'] as EventType[]).map((type) => (
          <li key={type} className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="size-2.5 rounded-full"
              style={{ backgroundColor: `hsl(var(--cat-${EVENT_CATEGORIES[type].color}))` }}
            />
            {EVENT_CATEGORIES[type].label}
          </li>
        ))}
      </ul>
    </div>
  )
}
