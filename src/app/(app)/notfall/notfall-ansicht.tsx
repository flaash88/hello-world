'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Copy, Phone, Settings2, ShieldAlert } from 'lucide-react'
import {
  KONTAKT_ROLLE_LABEL,
  NOTRUFE,
  NOTRUF_QUELLE,
  istBefuellt,
  telHref,
  type NotfallKarte,
} from '@/lib/emergency/card'
import { gespiegelteNotfallKarte, loescheNotfallSpiegel, spiegleNotfallKarte } from '@/lib/offline/queue'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

/**
 * Maximaler Kontrast, sehr grosse Schrift, jede Nummer ueber die volle Breite
 * antippbar. Kein Nachtmodus-Dimming: wer diese Seite oeffnet, braucht sie
 * jetzt und nicht schonend.
 */
export function NotfallAnsicht({
  childId,
  karte: vomServer,
}: {
  childId: string | null
  karte: NotfallKarte | null
}) {
  const [karte, setKarte] = useState<NotfallKarte | null>(vomServer)
  const [ausSpiegel, setAusSpiegel] = useState(false)

  /*
   * Was der Server geliefert hat, wandert in den lokalen Bestand. Kam nichts,
   * gibt es zwei Faelle, die sich nicht gleich behandeln lassen:
   *
   * Offline geoeffnet – dann ist die Spiegelung genau das, wofuer sie da ist.
   *
   * Online, und der Server sagt: es gibt kein Kind mehr. Dann muss die
   * Spiegelung weg. Eine Notfallkarte mit Gewicht, Allergien und Geburtsdatum
   * eines geloeschten Kindes bleibt sonst fuer immer stehen, und im Notfall
   * liest jemand daraus vor.
   */
  useEffect(() => {
    let abgebrochen = false

    if (vomServer) {
      void spiegleNotfallKarte(vomServer).catch(() => {})
      return
    }

    const offline = typeof navigator !== 'undefined' && navigator.onLine === false
    if (!offline) {
      void loescheNotfallSpiegel().catch(() => {})
      return
    }

    void gespiegelteNotfallKarte()
      .then((spiegel) => {
        if (abgebrochen || !spiegel) return
        setKarte(spiegel.karte as NotfallKarte)
        setAusSpiegel(true)
      })
      .catch(() => {})

    return () => {
      abgebrochen = true
    }
  }, [vomServer])

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-3xl font-bold">Notfall</h1>

      <section aria-label="Notrufnummern" className="flex flex-col gap-2">
        {NOTRUFE.map((notruf) => (
          <a
            key={notruf.key}
            href={telHref(notruf.nummer)}
            className={cn(
              // Hoechster Kontrast, den das jeweilige Thema hergibt – nicht
              // fest weiss. Ein Notfall passiert nachts, und dann stand hier
              // eine leuchtend weisse Flaeche in einer sonst tiefdunklen App.
              // Die dringenden Nummern heben sich ueber eine breite Kante ab,
              // nicht ueber eine gefuellte Flaeche.
              'flex min-h-20 w-full items-center gap-4 rounded-xl border-2 border-foreground bg-card py-3 pr-4 text-card-foreground',
              notruf.dringend ? 'border-l-[10px] border-l-primary pl-3' : 'pl-4',
            )}
          >
            <Phone
              className={cn('size-7 shrink-0', notruf.dringend && 'text-primary')}
              aria-hidden
            />
            <span className="min-w-0 flex-1">
              {/* Die Nummer in der Grotesk, nicht in der Display-Serife:
                  Fraunces setzt Ziffern schmal und mit Serifen, und genau die
                  muss man im Notfall auf einen Blick treffen. */}
              <span className="block font-sans text-3xl font-extrabold leading-tight tracking-wide tabular">
                {notruf.nummer}
              </span>
              <span className="block text-base font-semibold">{notruf.name}</span>
              <span className="block text-sm leading-snug text-muted-foreground">{notruf.hinweis}</span>
            </span>
          </a>
        ))}
      </section>

      {karte?.adresse && <Adresse adresse={karte.adresse} />}

      {karte && (
        <>
          <section
            aria-label="Angaben zum Kind"
            className="rounded-xl border-2 border-foreground bg-card p-4 text-card-foreground"
          >
            <h2 className="font-display text-2xl font-bold">{karte.kind.name}</h2>
            <dl className="mt-2 flex flex-col gap-2 text-lg">
              <Zeile label="Geboren" wert={karte.kind.geburtsdatum} zusatz={karte.kind.alter} />
              <Zeile label="Gewicht" wert={karte.kind.gewicht} zusatz={karte.kind.gewichtVom} />
              <Zeile label="Blutgruppe" wert={karte.kind.blutgruppe} />
              <Zeile
                label="Allergien"
                wert={karte.kind.allergien.length > 0 ? karte.kind.allergien.join(', ') : null}
                leer="keine eingetragen"
              />
              <Zeile
                label="Dauermedikamente"
                wert={
                  karte.kind.dauermedikamente.length > 0
                    ? karte.kind.dauermedikamente.join(', ')
                    : null
                }
                leer="keine eingetragen"
              />
              <Zeile label="Vorerkrankungen" wert={karte.kind.vorerkrankungen} />
            </dl>
          </section>

          {karte.kontakte.length > 0 && (
            <section aria-label="Kontakte" className="flex flex-col gap-2">
              {karte.kontakte.map((kontakt) => (
                <a
                  key={kontakt.id}
                  href={telHref(kontakt.nummer)}
                  className="flex min-h-20 w-full items-center gap-4 rounded-xl border-2 border-foreground bg-card px-4 py-3 text-card-foreground"
                >
                  <Phone className="size-6 shrink-0" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block font-sans text-2xl font-extrabold leading-tight tracking-wide tabular">
                      {kontakt.nummer}
                    </span>
                    <span className="block text-base font-semibold">{kontakt.name}</span>
                    <span className="block text-sm text-muted-foreground">
                      {KONTAKT_ROLLE_LABEL[kontakt.rolle]}
                    </span>
                  </span>
                </a>
              ))}
            </section>
          )}

          {karte.impfungen.length > 0 && (
            <section
              aria-label="Zuletzt dokumentierte Impfungen"
              className="rounded-xl border-2 border-foreground bg-card p-4 text-card-foreground"
            >
              <h2 className="text-base font-bold uppercase tracking-wide">Zuletzt geimpft</h2>
              <ul className="mt-1 text-base">
                {karte.impfungen.map((impfung) => (
                  <li key={`${impfung.titel}-${impfung.datum}`}>
                    {impfung.datum} · {impfung.titel}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {!istBefuellt(karte) && (
            <p className="text-base">
              Auf der Karte steht bisher nur, was ohnehin gilt. Blutgruppe, Vorerkrankungen,
              Adresse und die eigenen Nummern stehen in den Einstellungen unter Notfalldaten.
            </p>
          )}
        </>
      )}

      {!karte && (
        <p className="text-base">
          Diese Karte hat noch keine Daten. Öffne sie einmal mit Verbindung, dann steht sie auch
          ohne Netz zur Verfügung.
        </p>
      )}

      {ausSpiegel && karte && (
        <p className="text-sm">
          Ohne Verbindung angezeigt · Stand {new Date(karte.stand).toLocaleString('de-AT')}
        </p>
      )}

      {childId && (
        <Button asChild variant="outline" size="lg">
          <Link href="/mehr/notfall">
            <Settings2 aria-hidden />
            Angaben und Kontakte pflegen
          </Link>
        </Button>
      )}

      <p className="flex items-start gap-2 text-sm">
        <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
        Diese Karte zeigt, was ihr eingetragen habt. Sie rechnet nichts aus und leitet aus dem
        Gewicht keine Dosierung ab.
      </p>

      <p className="pb-4 text-xs leading-snug text-muted-foreground">
        {NOTRUF_QUELLE.text} Stand {NOTRUF_QUELLE.stand}.
      </p>
    </div>
  )
}

function Zeile({
  label,
  wert,
  zusatz,
  leer = 'nicht eingetragen',
}: {
  label: string
  wert: string | null
  zusatz?: string | null
  leer?: string
}) {
  return (
    <div>
      <dt className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className={cn('font-semibold', wert ? '' : 'text-muted-foreground')}>
        {wert ?? leer}
        {wert && zusatz ? <span className="font-normal text-muted-foreground"> · {zusatz}</span> : null}
      </dd>
    </div>
  )
}

/** Die Adresse ist das Erste, wonach im Notruf gefragt wird. */
function Adresse({ adresse }: { adresse: string }) {
  const { toast } = useToast()

  return (
    <section
      aria-label="Adresse"
      className="rounded-xl border-2 border-foreground bg-card p-4 text-card-foreground"
    >
      <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Wir sind hier</h2>
      <p className="mt-1 font-display text-2xl font-bold leading-tight">{adresse}</p>
      <Button
        variant="outline"
        size="lg"
        className="mt-3 w-full border-foreground text-card-foreground"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(adresse)
            toast({ title: 'Adresse kopiert' })
          } catch {
            toast({ title: 'Kopieren ging nicht', description: 'Bitte von Hand abtippen.' })
          }
        }}
      >
        <Copy aria-hidden />
        Adresse kopieren
      </Button>
    </section>
  )
}
