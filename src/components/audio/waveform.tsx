'use client'
import { cn } from '@/lib/utils'

/**
 * Wellenform als schlichte Balkenreihe. Die Ausschlaege sind beim Hochladen
 * einmal berechnet worden – hier wird nur gezeichnet.
 *
 * Ein Tap springt an die entsprechende Stelle; die Balken links vom
 * Abspielpunkt sind gefuellt.
 */
export function Waveform({
  peaks,
  fortschritt,
  onSeek,
  label,
}: {
  peaks: number[]
  /** 0 bis 1. */
  fortschritt: number
  onSeek?: (anteil: number) => void
  label: string
}) {
  const balken = peaks.length > 0 ? peaks : Array.from({ length: 48 }, () => 0.15)
  const gespielt = Math.round(balken.length * Math.min(1, Math.max(0, fortschritt)))

  return (
    <div
      role={onSeek ? 'slider' : 'img'}
      aria-label={label}
      aria-valuemin={onSeek ? 0 : undefined}
      aria-valuemax={onSeek ? 100 : undefined}
      aria-valuenow={onSeek ? Math.round(fortschritt * 100) : undefined}
      tabIndex={onSeek ? 0 : undefined}
      onKeyDown={(event) => {
        if (!onSeek) return
        if (event.key === 'ArrowRight') onSeek(Math.min(1, fortschritt + 0.05))
        if (event.key === 'ArrowLeft') onSeek(Math.max(0, fortschritt - 0.05))
      }}
      onClick={(event) => {
        if (!onSeek) return
        const rect = event.currentTarget.getBoundingClientRect()
        onSeek(Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)))
      }}
      className={cn('flex h-12 items-center gap-px', onSeek && 'cursor-pointer')}
    >
      {balken.map((peak, index) => (
        <span
          key={index}
          aria-hidden
          className={cn(
            'flex-1 rounded-sm',
            index < gespielt ? 'bg-primary' : 'bg-border',
          )}
          // Mindesthoehe, damit auch Stille als Linie sichtbar bleibt.
          style={{ height: `${Math.max(8, Math.round(peak * 100))}%` }}
        />
      ))}
    </div>
  )
}
