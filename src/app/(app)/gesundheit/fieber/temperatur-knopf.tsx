'use client'
import { useState } from 'react'
import { Thermometer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EventDialog } from '@/components/tracker/event-dialog'

/**
 * Eintrag direkt aus dem Fieberbereich.
 *
 * Vorher stand hier ein Link auf `/heute`. Dort landet man auf dem Dashboard
 * und muss sich den Weg über „Etwas anderes eintragen" → „Gesundheit" selbst
 * suchen – drei Taps, von denen keiner angekündigt war. Wer nachts die
 * Temperatur eintragen will, braucht den Dialog, nicht die Startseite.
 *
 * Der Gesundheits-Dialog steht ab Werk auf „Temperatur"; Medikament, Symptom
 * und der Rest sind dieselbe Auswahl wie überall sonst.
 */
export function TemperaturKnopf({
  childId,
  label = 'Temperatur eintragen',
  variant = 'default',
  className,
}: {
  childId: string
  label?: string
  variant?: 'default' | 'outline'
  className?: string
}) {
  const [offen, setOffen] = useState(false)

  return (
    <>
      <Button size="lg" variant={variant} className={className} onClick={() => setOffen(true)}>
        <Thermometer aria-hidden />
        {label}
      </Button>
      {offen && (
        <EventDialog
          childId={childId}
          type="health"
          open
          onOpenChange={(next) => !next && setOffen(false)}
        />
      )}
    </>
  )
}
