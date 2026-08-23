'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Copy, Phone, Settings2, ShieldAlert } from 'lucide-react'
import {
  KONTAKT_ROLLE_LABEL,
  NOTRUFE,
  istBefuellt,
  telHref,
  type NotfallKarte,
} from '@/lib/emergency/card'
import { gespiegelteNotfallKarte, spiegleNotfallKarte } from '@/lib/offline/queue'
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

  // Was der Server geliefert hat, wandert in den lokalen Bestand. Kam nichts
  // (offline geoeffnet), wird von dort gelesen.
  useEffect(() => {
    let abgebrochen = false

    if (vomServer) {
      void spiegleNotfallKarte(vomServer).catch(() => {})
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
    <div className="flex flex-col gap-4 [color-scheme:light]">
      <h1 className="font-display text-3xl font-bold">Notfall</h1>

      <section aria-label="Notrufnummern" className="flex flex-col gap-2">
        {NOTRUFE.map((notruf) => (
          <a
            key={notruf.key}
            href={telHref(notruf.nummer)}
            className={cn(
              'flex min-h-20 w-full items-center gap-4 rounded-xl border-2 px-4 py-3',
              notruf.dringend
                ? 'border-black bg-black text-white'
                : 'border-black bg-white text-black',
            )}
          >
            <Phone className="size-7 shrink-0" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block font-display text-2xl font-bold tabular">{notruf.nummer}</span>
              <span className="block text-base font-semibold">{notruf.name}</span>
              <span className={cn('block text-sm', notruf.dringend ? 'text-white/80' : 'text-black/70')}>
                {notruf.hinweis}
              </span>
            </span>
          </a>
        ))}
      </section>

      {karte?.adresse && <Adresse adresse={karte.adresse} />}

      {karte && (
        <>
          <section
            aria-label="Angaben zum Kind"
            className="rounded-xl border-2 border-black bg-white p-4 text-black"
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
                  className="flex min-h-20 w-full items-center gap-4 rounded-xl border-2 border-black bg-white px-4 py-3 text-black"
                >
                  <Phone className="size-6 shrink-0" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-xl font-bold tabular">
                      {kontakt.nummer}
                    </span>
                    <span className="block text-base font-semibold">{kontakt.name}</span>
                    <span className="block text-sm text-black/70">
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
              className="rounded-xl border-2 border-black bg-white p-4 text-black"
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
              Auf der Karte steht bisher nur, was ohnehin gilt. Trag Blutgruppe, Vorerkrankungen,
              Adresse und die wichtigsten Nummern ein – im Notfall sucht sie sonst niemand.
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
      <dt className="text-sm font-semibold uppercase tracking-wide text-black/60">{label}</dt>
      <dd className={cn('font-semibold', wert ? '' : 'text-black/60')}>
        {wert ?? leer}
        {wert && zusatz ? <span className="font-normal text-black/60"> · {zusatz}</span> : null}
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
      className="rounded-xl border-2 border-black bg-white p-4 text-black"
    >
      <h2 className="text-sm font-bold uppercase tracking-wide text-black/60">Wir sind hier</h2>
      <p className="mt-1 font-display text-2xl font-bold leading-tight">{adresse}</p>
      <Button
        variant="outline"
        size="lg"
        className="mt-3 w-full border-black text-black"
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
