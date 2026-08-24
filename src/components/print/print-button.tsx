'use client'
import { Download, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Drucken aus der App heraus.
 *
 * Bisher stand hier nur der Hinweis „über das Browser-Menü drucken". In der
 * installierten App auf dem iPhone gibt es dieses Menü nicht: Safari läuft im
 * Standalone-Modus ohne Adressleiste und ohne Teilen-Knopf. Der Hinweis war
 * also genau dort falsch, wo die App am häufigsten benutzt wird.
 *
 * `window.print()` funktioniert auch im Standalone-Modus – iOS öffnet die
 * AirPrint-Auswahl, und über „In Dateien speichern" entsteht daraus ein PDF.
 * Wo es zusätzlich ein serverseitig gebautes PDF gibt (Stillprotokoll,
 * Wochenbericht), steht der Weg daneben: das Ergebnis ist verlässlicher als
 * was der Browser aus der Seite macht.
 */
export function PrintButton({
  /** Serverseitig gebautes PDF, falls es eines gibt. */
  pdfHref,
  pdfLabel = 'Als PDF laden',
  label = 'Drucken',
}: {
  pdfHref?: string
  pdfLabel?: string
  label?: string
}) {
  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <Button variant="outline" className="h-12" onClick={() => window.print()}>
        <Printer aria-hidden />
        {label}
      </Button>
      {pdfHref && (
        <Button asChild variant="outline" className="h-12">
          <a href={pdfHref} download>
            <Download aria-hidden />
            {pdfLabel}
          </a>
        </Button>
      )}
    </div>
  )
}
