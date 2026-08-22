import { clamp } from '@/lib/utils'

const COLORS = {
  fresh: 'hsl(var(--cat-solids))',
  building: 'hsl(var(--cat-feed))',
  ready: 'hsl(var(--primary))',
  overtired: 'hsl(var(--destructive))',
} as const

/**
 * Schlafdruck als Ring: fuellt sich seit dem letzten Aufwachen. Ueber 100 %
 * laeuft ein zweiter, duennerer Ring weiter – so sieht man auch deutliche
 * Uebermuedung.
 */
export function SleepPressureRing({
  ratio,
  level,
}: {
  ratio: number
  level: keyof typeof COLORS
}) {
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
        aria-label={`Schlafdruck ${Math.round(ratio * 100)} Prozent`}
      >
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={COLORS[level]}
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
            stroke={COLORS.overtired}
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * (radius - stroke)}
            strokeDashoffset={2 * Math.PI * (radius - stroke) * (1 - overflow)}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )}
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-display text-lg font-bold tabular">
        {Math.round(ratio * 100)}%
      </span>
    </div>
  )
}
