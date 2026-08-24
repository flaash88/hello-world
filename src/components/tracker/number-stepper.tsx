'use client'
import { useEffect, useRef, useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  HALTEN_BIS_MS,
  WIEDERHOLUNG_MS,
  alsEingabe,
  ausEingabe,
  beimVerlassen,
  naechsterWert,
  schrittFuer,
} from '@/lib/tracker/stepper'

/**
 * Zahleneingabe mit grossen Plus-/Minus-Flaechen. Tippen geht weiterhin, aber
 * einhaendig kommt man mit den Tasten schneller ans Ziel.
 *
 * Zwei Dinge, die nicht offensichtlich sind:
 *
 * Waehrend des Tippens wird **nicht** begrenzt. Wer bei einem Feld von 30 bis
 * 45 die „38" eintippt, hat nach der ersten Ziffer eine 3 im Feld – wird die
 * sofort auf 30 hochgezogen, macht die zweite Ziffer daraus 308 und damit 45.
 * Begrenzt wird deshalb erst beim Verlassen des Feldes.
 *
 * Gedrueckt halten laesst die Zahl weiterlaufen und nach kurzer Zeit schneller.
 * Ohne das braucht 36 auf 40 Grad vierzig Taps.
 */
export function NumberStepper({
  id,
  label,
  value,
  onChange,
  step = 10,
  min = 0,
  max = 1000,
  unit,
  placeholder,
}: {
  id: string
  label: string
  value: number | null
  onChange: (value: number | null) => void
  step?: number
  min?: number
  max?: number
  unit?: string
  placeholder?: string
}) {
  // Solange getippt wird, gilt das Feld, nicht der gerundete Wert von aussen.
  const [entwurf, setEntwurf] = useState<string | null>(null)
  const halten = useRef<{ start: number; takt: number } | null>(null)
  const gehalten = useRef(false)
  // Der Takt der Wiederholung laeuft in einem Intervall, das den Wert aus
  // seinem Render festhaelt. Ohne diese Referenz rechnete jeder Schritt vom
  // selben Ausgangswert – die Zahl bliebe stehen.
  const stand = useRef(value)
  stand.current = value

  useEffect(() => stoppeHalten, [])

  function stoppeHalten() {
    if (!halten.current) return
    window.clearTimeout(halten.current.start)
    window.clearInterval(halten.current.takt)
    halten.current = null
  }

  function bump(richtung: number, wiederholung = 0) {
    setEntwurf(null)
    onChange(naechsterWert(stand.current, richtung * schrittFuer(wiederholung, step), min, max))
  }

  function starteHalten(richtung: number) {
    stoppeHalten()
    gehalten.current = false
    let wiederholung = 0
    const start = window.setTimeout(() => {
      gehalten.current = true
      const takt = window.setInterval(() => {
        wiederholung += 1
        bump(richtung, wiederholung)
      }, WIEDERHOLUNG_MS)
      if (halten.current) halten.current.takt = takt
    }, HALTEN_BIS_MS)
    halten.current = { start, takt: 0 }
  }

  function beendeHalten(richtung: number) {
    const warGehalten = gehalten.current
    stoppeHalten()
    // Ein kurzer Tap zaehlt einmal; nach einem Halten waere das einer zu viel.
    if (!warGehalten) bump(richtung)
    gehalten.current = false
  }

  const taste = (richtung: number, Icon: typeof Minus, beschriftung: string) => (
    <button
      type="button"
      aria-label={beschriftung}
      className="flex size-12 shrink-0 touch-none select-none items-center justify-center rounded-lg border-2 border-border"
      onPointerDown={(event) => {
        event.preventDefault()
        starteHalten(richtung)
      }}
      onPointerUp={() => beendeHalten(richtung)}
      onPointerLeave={stoppeHalten}
      onPointerCancel={stoppeHalten}
      onContextMenu={(event) => event.preventDefault()}
      // Zeigerereignisse kennt die Tastatur nicht; ein Klick ohne Zeiger
      // (`detail === 0`) kommt von Enter oder Leertaste.
      onClick={(event) => {
        if (event.detail === 0) bump(richtung)
      }}
    >
      <Icon className="size-5" aria-hidden />
    </button>
  )

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>
        {label}
        {unit && <span className="ml-1 font-normal">({unit})</span>}
      </Label>
      <div className="flex items-center gap-2">
        {taste(-1, Minus, `${label} verringern`)}
        <Input
          id={id}
          inputMode="decimal"
          className="text-center text-lg font-semibold tabular"
          placeholder={placeholder}
          value={entwurf ?? alsEingabe(value)}
          onChange={(event) => {
            const roh = event.target.value
            setEntwurf(roh)
            onChange(ausEingabe(roh))
          }}
          onBlur={() => {
            setEntwurf(null)
            onChange(beimVerlassen(stand.current, min, max))
          }}
        />
        {taste(1, Plus, `${label} erhöhen`)}
      </div>
    </div>
  )
}
