'use client'
import { useMemo, useState } from 'react'
import type { HeatmapCell } from '@/lib/stats/aggregate'
import { cn } from '@/lib/utils'

/**
 * Schlaf der letzten 30 Tage: Zeile = Tag, Spalte = Stunde. Je dunkler, desto
 * mehr Schlafminuten in dieser Stunde. Muster wie "wacht immer um 5 auf" sieht
 * man hier schneller als in jeder Zahlenkolonne.
 */
export function SleepHeatmap({
  cells,
  dayKeys,
}: {
  cells: HeatmapCell[]
  dayKeys: string[]
}) {
  const [hovered, setHovered] = useState<{ dayKey: string; hour: number; minutes: number } | null>(null)

  const lookup = useMemo(() => {
    const map = new Map<string, number>()
    for (const cell of cells) map.set(`${cell.dayKey}:${cell.hour}`, cell.minutes)
    return map
  }, [cells])

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-1 pl-10 text-[9px] text-muted-foreground">
        {[0, 6, 12, 18].map((hour) => (
          <span key={hour} className="flex-1 text-left">
            {String(hour).padStart(2, '0')}:00
          </span>
        ))}
      </div>

      <div className="flex flex-col gap-px">
        {dayKeys.map((dayKey) => (
          <div key={dayKey} className="flex items-center gap-1">
            <span className="w-9 shrink-0 text-right text-[9px] tabular text-muted-foreground">
              {dayKey.slice(8)}.{dayKey.slice(5, 7)}.
            </span>
            <div className="flex flex-1 gap-px">
              {Array.from({ length: 24 }, (_, hour) => {
                const minutes = lookup.get(`${dayKey}:${hour}`) ?? 0
                const intensity = minutes / 60
                return (
                  <button
                    key={hour}
                    type="button"
                    onClick={() => setHovered({ dayKey, hour, minutes })}
                    aria-label={`${dayKey}, ${hour} Uhr: ${minutes} Minuten Schlaf`}
                    className={cn(
                      'h-4 flex-1 rounded-[2px] transition-opacity',
                      minutes === 0 && 'bg-muted',
                    )}
                    style={
                      minutes > 0
                        ? { backgroundColor: `hsl(var(--cat-sleep) / ${0.25 + intensity * 0.75})` }
                        : undefined
                    }
                  />
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <p aria-live="polite" className="min-h-5 text-center text-xs text-muted-foreground">
        {hovered
          ? `${hovered.dayKey.slice(8)}.${hovered.dayKey.slice(5, 7)}., ${String(hovered.hour).padStart(2, '0')}:00 – ${hovered.minutes} Min Schlaf`
          : 'Zeile = Tag, Spalte = Stunde. Antippen für Details.'}
      </p>
    </div>
  )
}
