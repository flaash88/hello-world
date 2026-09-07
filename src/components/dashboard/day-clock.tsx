'use client'
import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { EVENT_CATEGORIES, type EventType } from '@/lib/events/types'
import {
  arcPath,
  minuteAusPunkt,
  minuteLabel,
  polarPoint,
  radiusAusPunkt,
  ringFuerRadius,
  segmentBeiMinute,
  type DaySegment,
} from '@/lib/dashboard/day-segments'
import { formatDuration } from '@/lib/time'
import { cn } from '@/lib/utils'

/**
 * Die Zeichenflaeche ist groesser als die Scheibe: Die Stundenbeschriftungen
 * liegen ausserhalb des Rings, und bei 300 Einheiten lagen alle vier von ihnen
 * rechnerisch neben der Flaeche – 00:00 bei y = -8. Sie wurden schlicht
 * abgeschnitten.
 */
const SIZE = 340
const CENTER = SIZE / 2

/**
 * Die vier Stundenbeschriftungen.
 *
 * Links und rechts stehen sie etwas weiter innen und haengen sich an ihr
 * aeusseres Ende, statt mittig ueber dem Strich zu sitzen: „18:00" ist bei
 * 13 Pixeln rund 36 Einheiten breit, und mittig gesetzt ragt die Haelfte davon
 * aus der Zeichenflaeche. Oben und unten ist Platz, dort bleibt es mittig.
 */
const STUNDEN_LABELS: { minute: number; radius: number; anchor: 'middle' | 'start' | 'end' }[] = [
  { minute: 0, radius: 156, anchor: 'middle' },
  { minute: 360, radius: 152, anchor: 'end' },
  { minute: 720, radius: 156, anchor: 'middle' },
  { minute: 1080, radius: 152, anchor: 'start' },
]
/** Aussenkante der Grundscheibe. */
const SCHEIBE = 142

/**
 * Jede Kategorie bekommt ihren eigenen Ring – so ueberlagert sich nichts.
 * Kein Ring ist duenner als 22 Einheiten; der innerste hatte vorher 12, und
 * darin war ein einzelner Eintrag anderthalb Einheiten breit.
 */
const RINGS: { types: EventType[]; outer: number; inner: number }[] = [
  { types: ['sleep'], outer: 140, inner: 112 },
  { types: ['nursing', 'bottle', 'solids', 'pumping'], outer: 108, inner: 80 },
  { types: ['diaper'], outer: 76, inner: 54 },
  { types: ['mood', 'health', 'other'], outer: 50, inner: 28 },
]

/** Radius der Marke fuer einen Eintrag ohne Dauer. */
const PUNKT_RADIUS = 7

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

  /**
   * Ausgewaehlt wird ueber die Scheibe, nicht ueber den Bogen. Ein Eintrag
   * ohne Dauer ist als Bogen keine zwei Pixel breit – wer den treffen muss,
   * trifft ihn nachts nicht. Der Tap sagt nur, in welchem Ring und zu welcher
   * Uhrzeit er lag; welcher Eintrag gemeint war, rechnet
   * `segmentBeiMinute` aus.
   */
  function waehleBeiTap(event: React.MouseEvent<SVGSVGElement>) {
    const flaeche = event.currentTarget.getBoundingClientRect()
    if (flaeche.width === 0 || flaeche.height === 0) return
    const x = ((event.clientX - flaeche.left) / flaeche.width) * SIZE
    const y = ((event.clientY - flaeche.top) / flaeche.height) * SIZE

    const ringIndex = ringFuerRadius(radiusAusPunkt(x, y, CENTER), RINGS)
    if (ringIndex === null) {
      setSelected(null)
      return
    }
    const treffer = segmentBeiMinute(
      rings[ringIndex]?.items ?? [],
      minuteAusPunkt(x, y, CENTER),
    )
    setSelected(treffer)
  }

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
          className="w-full max-w-[420px] cursor-pointer"
          role="img"
          aria-label={`Tagesübersicht für ${dayLabel} mit ${segments.length} Einträgen`}
          onClick={waehleBeiTap}
        >
          <defs>
            <pattern id="geplant" width="6" height="6" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
              <rect width="6" height="6" fill="hsl(var(--muted))" />
              <line x1="0" y1="0" x2="0" y2="6" stroke="hsl(var(--primary))" strokeWidth="2" opacity="0.6" />
            </pattern>
          </defs>

          {/* Grundscheibe und Stundenraster */}
          <circle cx={CENTER} cy={CENTER} r={SCHEIBE} fill="hsl(var(--muted))" opacity={0.4} />
          {hourTicks.map((minute) => {
            const major = minute % 360 === 0
            const outer = polarPoint(minute, SCHEIBE + 2, CENTER)
            const inner = polarPoint(minute, major ? SCHEIBE - 12 : SCHEIBE - 4, CENTER)
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
          {STUNDEN_LABELS.map(({ minute, radius, anchor }) => {
            const point = polarPoint(minute, radius, CENTER)
            return (
              <text
                key={minute}
                x={point.x}
                y={point.y}
                textAnchor={anchor}
                dominantBaseline="middle"
                className="fill-muted-foreground text-[13px] font-semibold"
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

          {/*
           * Eintraege je Ring. Was eine Dauer hat, wird ein Bogen; was keine
           * hat – eine Windel, ein Fieberwert –, wird eine Marke. Als Bogen
           * waere so ein Eintrag anderthalb Einheiten breit und damit ein
           * Strich, den man weder sieht noch trifft.
           */}
          {rings.map((ring) =>
            ring.items.map((segment) => {
              const category = EVENT_CATEGORIES[segment.type as EventType]
              const farbe = `hsl(var(--cat-${category?.color ?? 'other'}))`
              const gewaehlt = selected?.id === segment.id
              const umriss = gewaehlt ? 'hsl(var(--foreground))' : 'none'

              if (segment.isPoint) {
                const mitte = polarPoint(segment.fromMin, (ring.inner + ring.outer) / 2, CENTER)
                return (
                  <circle
                    key={segment.id}
                    data-eintrag={segment.type}
                    cx={mitte.x}
                    cy={mitte.y}
                    r={PUNKT_RADIUS}
                    fill={farbe}
                    stroke={umriss}
                    strokeWidth={gewaehlt ? 2 : 0}
                  >
                    <title>{segment.label}</title>
                  </circle>
                )
              }

              return (
                <path
                  key={segment.id}
                  data-eintrag={segment.type}
                  d={arcPath(segment.fromMin, segment.toMin, ring.inner, ring.outer, CENTER)}
                  fill={farbe}
                  opacity={segment.running ? 0.75 : 1}
                  stroke={umriss}
                  strokeWidth={gewaehlt ? 2 : 0}
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
                x2={polarPoint(nowMinutes, SCHEIBE + 4, CENTER).x}
                y2={polarPoint(nowMinutes, SCHEIBE + 4, CENTER).y}
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                strokeLinecap="round"
              />
              <circle
                cx={polarPoint(nowMinutes, SCHEIBE + 4, CENTER).x}
                cy={polarPoint(nowMinutes, SCHEIBE + 4, CENTER).y}
                r={5}
                fill="hsl(var(--primary))"
              />
            </>
          )}

          <circle cx={CENTER} cy={CENTER} r={26} fill="hsl(var(--card))" />
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
              : 'Tippe in einen Ring für Details, wische für andere Tage.'}
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
