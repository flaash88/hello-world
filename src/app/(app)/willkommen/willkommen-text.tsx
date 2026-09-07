'use client'
import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { markIntroSeenAction } from '@/lib/actions/features'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

/**
 * Ein Text, zwei Knöpfe. Kein Rundgang durch Funktionen, die gerade aus sind –
 * die Aufzählung dessen, was es noch gäbe, wäre selbst schon der Sog, den wir
 * vermeiden wollen.
 */
export function WillkommenText({ hasChild }: { hasChild: boolean }) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function weiter(ziel: string) {
    startTransition(async () => {
      await markIntroSeenAction()
      router.push(ziel)
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-4 pt-4">
      <h1 className="font-display text-2xl font-bold">Willkommen bei Sprössling</h1>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Die App startet als Protokoll</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm leading-relaxed">
          <p>
            Stillen, Flasche, Abpumpen, Windel, Gewicht: eintragen, nachlesen, bei Bedarf
            ausdrucken. Dazu die Notfallkarte, die Fristen aus dem Eltern-Kind-Pass und das
            Tagebuch.
          </p>
          <p>
            Was rechnet, vergleicht oder vorhersagt, ist zu Beginn aus. Auch die
            Benachrichtigungen: außer den Terminfristen meldet sich die App von sich aus nicht.
          </p>
          <p>
            Das ist keine abgespeckte Fassung. Es ist die Fassung, mit der sich in den ersten
            Wochen am besten leben lässt – ein Protokoll erzeugt keine Vorgaben, die euer Kind
            erfüllen müsste.
          </p>
          <p className="text-muted-foreground">
            Alles Weitere steht unter <strong>Mehr → Was die App anzeigt</strong> und lässt sich
            einzeln dazuschalten. Genauso einfach geht es wieder zurück.
          </p>
        </CardContent>
      </Card>

      <Button size="lg" className="h-14" disabled={pending} onClick={() => weiter('/heute')}>
        {hasChild ? 'Los geht’s' : 'Weiter'}
      </Button>
      {!hasChild && (
        <Button variant="outline" disabled={pending} onClick={() => weiter('/onboarding')}>
          Kind oder Schwangerschaft anlegen
        </Button>
      )}
    </div>
  )
}
