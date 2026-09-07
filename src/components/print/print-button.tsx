'use client'
import { useEffect, useRef, useState } from 'react'
import { FileText, Printer, Share } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { druckenMoeglich, umgebungAusBrowser } from '@/lib/pwa/umgebung'
import { dateinameAus, kannPdfTeilen, teilAusgang } from '@/lib/pwa/teilen'

/**
 * Der Weg von einer Ansicht zu etwas, das man ausdrucken oder weitergeben kann.
 *
 * In der vom Startbildschirm gestarteten App gibt es keine Bedienleiste: Ein
 * Link mit `target="_blank"` öffnet das PDF dort innerhalb der App, und es
 * steht bildschirmfüllend da – ohne Teilen, ohne Drucken, ohne Zurück. Deshalb
 * wird das PDF, wo es geht, an das Teilen-Blatt des Geräts gegeben; dort gibt
 * es Drucken, „In Dateien sichern", AirDrop und Mail. Nur wo der Browser das
 * nicht kann, bleibt der neue Tab – am Rechner und auf Android ist er das
 * Richtige.
 *
 * Der Drucken-Knopf erscheint zusätzlich dort, wo `window.print()` etwas
 * bewirkt. Beides entscheidet sich erst nach dem Einhängen: Der Server kann
 * nicht wissen, woran die App gerade läuft.
 */
export function PrintButton({
  pdfHref,
  pdfLabel = 'Als PDF öffnen',
  teilenLabel = 'PDF teilen',
  label = 'Drucken',
}: {
  pdfHref: string
  pdfLabel?: string
  teilenLabel?: string
  label?: string
}) {
  const [drucken, setDrucken] = useState(false)
  const [teilbar, setTeilbar] = useState(false)
  const [laeuft, setLaeuft] = useState(false)
  const [hinweis, setHinweis] = useState<string | null>(null)
  // Einmal geladen, bleibt die Datei liegen – der zweite Tap teilt sofort.
  const datei = useRef<File | null>(null)

  useEffect(() => {
    setDrucken(druckenMoeglich(umgebungAusBrowser()))
    setTeilbar(kannPdfTeilen(window.navigator))
  }, [])

  async function ladeDatei(): Promise<File> {
    const antwort = await fetch(pdfHref)
    if (!antwort.ok) throw new Error(`Der Server antwortete mit ${antwort.status}.`)
    const blob = await antwort.blob()
    const name = dateinameAus(antwort.headers.get('content-disposition'), 'sproessling.pdf')
    return new File([blob], name, { type: 'application/pdf' })
  }

  async function teile() {
    setHinweis(null)
    setLaeuft(true)
    try {
      if (!datei.current) datei.current = await ladeDatei()
      // Nur die Datei, ohne Titel: Mit beidem gibt iOS teils den Text weiter
      // statt der Datei.
      await window.navigator.share({ files: [datei.current] })
    } catch (fehler) {
      const ausgang = teilAusgang(fehler)
      if (ausgang === 'nochmal') {
        // Über dem Laden ist die Nutzergeste verfallen. Die Datei liegt jetzt
        // bereit, der nächste Tap geht durch.
        setHinweis('Noch einmal tippen – das PDF liegt jetzt bereit.')
      } else if (ausgang === 'fehler') {
        setHinweis('Das PDF ließ sich nicht erstellen.')
      }
    } finally {
      setLaeuft(false)
    }
  }

  return (
    <div className="flex flex-col gap-1.5 print:hidden">
      <div className="flex flex-wrap gap-2">
        {teilbar ? (
          <Button variant="outline" className="h-12" disabled={laeuft} onClick={teile}>
            <Share aria-hidden />
            {laeuft ? 'Einen Moment …' : teilenLabel}
          </Button>
        ) : (
          <Button asChild variant="outline" className="h-12">
            <a href={pdfHref} target="_blank" rel="noopener noreferrer">
              <FileText aria-hidden />
              {pdfLabel}
            </a>
          </Button>
        )}
        {drucken && (
          <Button variant="outline" className="h-12" onClick={() => window.print()}>
            <Printer aria-hidden />
            {label}
          </Button>
        )}
      </div>
      {hinweis && <p className="text-sm text-muted-foreground">{hinweis}</p>}
    </div>
  )
}
