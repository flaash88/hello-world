'use client'
import { useEffect, useState } from 'react'
import { FileText, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { druckenMoeglich, umgebungAusBrowser } from '@/lib/pwa/umgebung'

/**
 * Der Weg von einer Ansicht zu etwas, das man ausdrucken oder weitergeben kann.
 *
 * Führend ist das serverseitig gebaute PDF, geöffnet in einem neuen Tab. In der
 * installierten App auf dem iPhone landet man damit im PDF-Betrachter des
 * Browsers, und dort führt der Teilen-Knopf zu Drucken, „In Dateien sichern"
 * und AirDrop. Ein `download`-Link tut an derselben Stelle nichts Sichtbares,
 * und `window.print()` ebenso wenig.
 *
 * Der Drucken-Knopf erscheint deshalb nur dort, wo er auch etwas bewirkt –
 * erst nach dem Einhängen, weil der Server nicht wissen kann, woran die App
 * gerade läuft.
 */
export function PrintButton({
  pdfHref,
  pdfLabel = 'Als PDF öffnen',
  label = 'Drucken',
}: {
  pdfHref: string
  pdfLabel?: string
  label?: string
}) {
  const [drucken, setDrucken] = useState(false)

  useEffect(() => {
    setDrucken(druckenMoeglich(umgebungAusBrowser()))
  }, [])

  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <Button asChild variant="outline" className="h-12">
        <a href={pdfHref} target="_blank" rel="noopener noreferrer">
          <FileText aria-hidden />
          {pdfLabel}
        </a>
      </Button>
      {drucken && (
        <Button variant="outline" className="h-12" onClick={() => window.print()}>
          <Printer aria-hidden />
          {label}
        </Button>
      )}
    </div>
  )
}
