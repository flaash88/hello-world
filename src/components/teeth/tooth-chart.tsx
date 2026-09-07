'use client'
import { CHART_BREITE, CHART_HOEHE, zahnPositionen } from '@/lib/teeth/layout'
import type { ZahnStatus } from '@/lib/teeth/overview'
import { cn } from '@/lib/utils'

export type ZahnAnzeige = { key: string; status: ZahnStatus; label: string }

/**
 * Das Milchgebiss als Zeichnung: oben und unten je zehn Zaehne auf einem
 * Bogen. Durchgebrochene Zaehne sind gefuellt, erwartete nur angedeutet.
 *
 * Ein Tap auf einen Zahn oeffnet seine Details. Die Trefferflaeche ist
 * bewusst groesser als der gezeichnete Zahn – mit einer Hand und einem Kind
 * am Arm trifft man sonst nichts.
 */
export function ToothChart({
  zaehne,
  onSelect,
  selected,
}: {
  zaehne: ZahnAnzeige[]
  onSelect: (key: string) => void
  selected?: string | null
}) {
  const byKey = new Map(zaehne.map((z) => [z.key, z]))
  const positionen = [...zahnPositionen('oben'), ...zahnPositionen('unten')]

  return (
    <svg
      viewBox={`0 0 ${CHART_BREITE} ${CHART_HOEHE}`}
      className="w-full max-w-md"
      role="group"
      aria-label="Milchgebiss"
    >
      <text
        x={CHART_BREITE / 2}
        y={16}
        textAnchor="middle"
        className="fill-muted-foreground text-[11px]"
      >
        Oberkiefer
      </text>
      <text
        x={CHART_BREITE / 2}
        y={CHART_HOEHE - 6}
        textAnchor="middle"
        className="fill-muted-foreground text-[11px]"
      >
        Unterkiefer
      </text>

      {positionen.map((position) => {
        const anzeige = byKey.get(position.zahn.key)
        const status = anzeige?.status ?? 'offen'
        const istGewaehlt = selected === position.zahn.key

        return (
          <g key={position.zahn.key}>
            <g
              transform={`translate(${position.x} ${position.y}) rotate(${position.rotation})`}
              className="pointer-events-none"
            >
              <rect
                x={-position.breite / 2}
                y={-position.hoehe / 2}
                width={position.breite}
                height={position.hoehe}
                rx={position.radius}
                className={cn(
                  'stroke-[1.5]',
                  status === 'da' && 'fill-primary stroke-primary',
                  status === 'ausgefallen' && 'fill-muted stroke-muted-foreground',
                  status === 'erwartet' && 'fill-transparent stroke-muted-foreground/60',
                  status === 'offen' && 'fill-transparent stroke-border',
                )}
                strokeDasharray={status === 'erwartet' ? '3 3' : undefined}
              />
              {istGewaehlt && (
                <rect
                  x={-position.breite / 2 - 4}
                  y={-position.hoehe / 2 - 4}
                  width={position.breite + 8}
                  height={position.hoehe + 8}
                  rx={position.radius + 3}
                  className="fill-none stroke-foreground stroke-[1.5]"
                />
              )}
            </g>

            {/* Trefferfläche: großzügig, unsichtbar, mit eigenem Label. */}
            <circle
              cx={position.x}
              cy={position.y}
              r={16}
              className="cursor-pointer fill-transparent"
              role="button"
              tabIndex={0}
              aria-label={anzeige?.label ?? position.zahn.name}
              aria-pressed={istGewaehlt}
              onClick={() => onSelect(position.zahn.key)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onSelect(position.zahn.key)
                }
              }}
            />
          </g>
        )
      })}
    </svg>
  )
}
