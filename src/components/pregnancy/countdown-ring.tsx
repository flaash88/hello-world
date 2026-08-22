import { GESTATION_DAYS, type GestationalAge } from '@/lib/pregnancy/weeks'

/**
 * Fortschrittsring mit SSW in der Mitte. Reines SVG, kein Chart-Paket – das
 * spart 40 kB auf der wichtigsten Seite der Schwangerschaft.
 */
export function CountdownRing({ age }: { age: GestationalAge }) {
  const size = 200
  const stroke = 14
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - age.progress)

  // Trimestergrenzen als feine Markierungen auf dem Ring.
  const marks = [14, 28].map((week) => ((week * 7) / GESTATION_DAYS) * 360 - 90)

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img"
        aria-label={`Schwangerschaftswoche ${age.week} plus ${age.day} Tage, ${Math.round(age.progress * 100)} Prozent`}>
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
          stroke="hsl(var(--primary))"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        {marks.map((angle) => {
          const rad = (angle * Math.PI) / 180
          const inner = radius - stroke / 2
          const outer = radius + stroke / 2
          return (
            <line
              key={angle}
              x1={size / 2 + Math.cos(rad) * inner}
              y1={size / 2 + Math.sin(rad) * inner}
              x2={size / 2 + Math.cos(rad) * outer}
              y2={size / 2 + Math.sin(rad) * outer}
              stroke="hsl(var(--background))"
              strokeWidth={3}
            />
          )
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-4xl font-bold tabular">{age.label}</span>
        <span className="text-sm text-muted-foreground">SSW</span>
      </div>
    </div>
  )
}
