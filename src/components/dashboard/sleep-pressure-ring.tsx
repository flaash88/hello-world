import { formatDuration } from '@/lib/time'
import { clamp } from '@/lib/utils'

/**
 * Wie lange schon wach, im Verhaeltnis zum sonst ueblichen Abstand.
 *
 * Bewusst einfarbig und ohne Prozentzahl in der Mitte: eine Ampel, die auf Rot
 * springt, sagt „ihr habt etwas verpasst" – und genau das ist hier nicht
 * gemeint. Ist mehr Zeit vergangen als sonst, laeuft ein zweiter, duennerer
 * Ring weiter, in derselben Farbe. In der Mitte steht die Zeit selbst.
 */
export function SleepPressureRing({ ratio, awakeMin }: { ratio: number; awakeMin: number }) {
  const size = 92
  const stroke = 10
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const primary = clamp(ratio, 0, 1)
  const overflow = clamp(ratio - 1, 0, 1)

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`Wach seit ${formatDuration(awakeMin * 60)}`}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--cat-sleep))"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - primary)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        {overflow > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius - stroke}
            fill="none"
            stroke="hsl(var(--cat-sleep))"
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * (radius - stroke)}
            strokeDashoffset={2 * Math.PI * (radius - stroke) * (1 - overflow)}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )}
      </svg>
      <span
        aria-hidden
        className="absolute inset-0 flex items-center justify-center px-2 text-center font-display text-sm font-bold tabular leading-tight"
      >
        {formatDuration(awakeMin * 60)}
      </span>
    </div>
  )
}
