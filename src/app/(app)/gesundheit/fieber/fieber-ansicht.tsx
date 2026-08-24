'use client'
import { PrintButton } from '@/components/print/print-button'
import { useEffect, useMemo, useState } from 'react'
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Info, Thermometer } from 'lucide-react'
import {
  FIEBER_AB_C,
  HOHES_FIEBER_AB_C,
  MESSORT_LABEL,
  ZEITRAEUME,
  restText,
  type Messort,
  type Zeitraum,
} from '@/lib/fever/episode'
import { formatDateLong, formatDateTime, formatTime } from '@/lib/time'
import { localeTag } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MedicalDisclaimer } from '@/components/medical-disclaimer'
import { PrintHeader } from '@/components/print/print-header'
import type { FieberDaten, GabeView, MessungView } from './types'

const HINWEIS_KEY = 'sp_fieber_hinweis'

/** Messorte unterscheidbar machen – Form statt Farbe, das druckt auch. */
const ORT_FORM: Record<Messort, 'circle' | 'square' | 'triangle' | 'diamond'> = {
  rectal: 'circle',
  ear: 'square',
  forehead: 'triangle',
  armpit: 'diamond',
}

function grad(value: number): string {
  return `${value.toLocaleString(localeTag(), { minimumFractionDigits: 1, maximumFractionDigits: 1 })} °C`
}

function dosis(gabe: { doseMl: number | null; doseMg: number | null }): string {
  const teile: string[] = []
  if (gabe.doseMl !== null) teile.push(`${gabe.doseMl.toLocaleString(localeTag())} ml`)
  if (gabe.doseMg !== null) teile.push(`${gabe.doseMg.toLocaleString(localeTag())} mg`)
  return teile.join(' · ')
}

export function FieberAnsicht({ daten }: { daten: FieberDaten }) {
  const [zeitraum, setZeitraum] = useState<Zeitraum>(24)
  const [hinweisOffen, setHinweisOffen] = useState(false)
  const [jetzt, setJetzt] = useState(() => Date.now())

  // Einmaliger Hinweis beim ersten Öffnen – danach nie wieder ungefragt.
  useEffect(() => {
    try {
      if (window.localStorage.getItem(HINWEIS_KEY) !== 'gelesen') setHinweisOffen(true)
    } catch {
      // Privater Modus ohne Speicher: dann eben jedes Mal.
      setHinweisOffen(true)
    }
  }, [])

  // Der Countdown soll laufen, ohne dass jemand neu lädt.
  useEffect(() => {
    const timer = window.setInterval(() => setJetzt(Date.now()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  function hinweisSchliessen() {
    setHinweisOffen(false)
    try {
      window.localStorage.setItem(HINWEIS_KEY, 'gelesen')
    } catch {
      // Nicht speicherbar – kein Grund, irgendetwas abzubrechen.
    }
  }

  const beginn = new Date(daten.beginn)
  const von = useMemo(
    () => (zeitraum === 'episode' ? beginn : new Date(jetzt - zeitraum * 3600_000)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [zeitraum, jetzt, daten.beginn],
  )

  const messungenImFenster = daten.messungen.filter((m) => new Date(m.at) >= von)
  const gabenImFenster = daten.gaben.filter((g) => new Date(g.at) >= von)

  const punkte = messungenImFenster.map((m) => ({
    t: new Date(m.at).getTime(),
    temperatureC: m.temperatureC,
    ort: m.ort,
  }))

  return (
    <div className="flex flex-col gap-4">
      {/* Auf dem Papier steht der Titel in der Kopfzeile des Zettels – hier
          waere er doppelt. */}
      <div className="flex items-start justify-between gap-2 print:hidden">
        <div>
          <h1 className="font-display text-2xl font-bold">Fieberverlauf</h1>
          <p className="text-muted-foreground">
            Seit {formatDateTime(beginn)}
            {daten.hoechste ? ` · höchste ${grad(daten.hoechste.temperatureC)}` : ''}
          </p>
        </div>
        <PrintButton />
      </div>

      {hinweisOffen && (
        <Card className="print:hidden">
          <CardContent className="flex flex-col gap-3 p-4">
            <p className="flex items-center gap-2 font-semibold">
              <Info className="size-4" aria-hidden />
              Was diese Ansicht tut – und was nicht
            </p>
            <p className="text-sm">
              Sie zeichnet auf, was ihr eintragt: Temperaturen, Medikamente und Symptome. Sie
              erinnert an das Intervall, das ihr selbst eingetragen habt.
            </p>
            <p className="text-sm">
              Sie rechnet <strong>keine</strong> Dosierungen aus – weder nach Gewicht noch nach
              Alter –, schlägt kein Präparat vor und prüft keine Höchstmenge. Wie viel wovon,
              entscheidet die Ärztin oder Apothekerin, nicht diese App.
            </p>
            <Button size="lg" onClick={hinweisSchliessen}>
              Verstanden
            </Button>
          </CardContent>
        </Card>
      )}

      <Tabs value={String(zeitraum)} onValueChange={(v) => setZeitraum(v === 'episode' ? 'episode' : (Number(v) as Zeitraum))}>
        <TabsList className="w-full print:hidden">
          {ZEITRAEUME.map((stunden) => (
            <TabsTrigger key={stunden} value={String(stunden)}>
              {stunden} h
            </TabsTrigger>
          ))}
          <TabsTrigger value="episode">Ganz</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="p-3">
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={punkte}
                margin={{ top: 8, right: 8, bottom: 4, left: -22 }}
              >
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                <XAxis
                  dataKey="t"
                  type="number"
                  domain={[von.getTime(), jetzt]}
                  tickFormatter={(value: number) => formatTime(new Date(value))}
                  tick={{ fontSize: 11 }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis
                  domain={[35, 41]}
                  ticks={[35, 36, 37, 38, 39, 40, 41]}
                  tick={{ fontSize: 11 }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '0.75rem',
                    fontSize: '0.8125rem',
                  }}
                  labelFormatter={(value) => formatDateTime(new Date(Number(value)))}
                  formatter={(value, _name, item) => {
                    const ort = (item?.payload as { ort?: Messort | null })?.ort
                    return [grad(Number(value)) + (ort ? ` · ${MESSORT_LABEL[ort]}` : ''), 'Temperatur']
                  }}
                />

                {/* Orientierungslinien, bewusst grau: sie markieren, sie warnen nicht. */}
                <ReferenceLine
                  y={FIEBER_AB_C}
                  stroke="hsl(var(--muted-foreground))"
                  strokeDasharray="4 4"
                  label={{ value: grad(FIEBER_AB_C), position: 'insideTopLeft', fontSize: 10 }}
                />
                <ReferenceLine
                  y={HOHES_FIEBER_AB_C}
                  stroke="hsl(var(--muted-foreground))"
                  strokeDasharray="4 4"
                  label={{ value: grad(HOHES_FIEBER_AB_C), position: 'insideTopLeft', fontSize: 10 }}
                />

                {/* Senkrechte je Medikamentengabe, beschriftet mit Mittel und Dosis. */}
                {gabenImFenster.map((gabe) => (
                  <ReferenceLine
                    key={gabe.id}
                    x={new Date(gabe.at).getTime()}
                    stroke="hsl(var(--primary))"
                    strokeWidth={1}
                    label={{
                      value: `${gabe.mittel}${dosis(gabe) ? ` ${dosis(gabe)}` : ''}`,
                      position: 'insideBottomLeft',
                      fontSize: 10,
                      angle: -90,
                    }}
                  />
                ))}

                <Line
                  type="monotone"
                  dataKey="temperatureC"
                  stroke="hsl(var(--foreground))"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
                {(Object.keys(ORT_FORM) as Messort[]).map((ort) => (
                  <Scatter
                    key={ort}
                    data={punkte.filter((p) => p.ort === ort)}
                    dataKey="temperatureC"
                    shape={ORT_FORM[ort]}
                    fill="hsl(var(--foreground))"
                    isAnimationActive={false}
                  />
                ))}
                <Scatter
                  data={punkte.filter((p) => p.ort === null)}
                  dataKey="temperatureC"
                  shape="cross"
                  fill="hsl(var(--muted-foreground))"
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <ul className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {(Object.keys(MESSORT_LABEL) as Messort[]).map((ort) => (
              <li key={ort}>{MESSORT_LABEL[ort]}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {daten.intervalle.length > 0 && (
        <section className="print:hidden">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
            Intervalle
          </h2>
          <ul className="flex flex-col gap-2">
            {daten.intervalle.map((eintrag) => {
              const rest = eintrag.fruehestensAb
                ? Math.max(
                    0,
                    Math.ceil((new Date(eintrag.fruehestensAb).getTime() - jetzt) / 60000),
                  )
                : 0
              return (
                <li key={eintrag.mittel}>
                  <Card>
                    <CardContent className="flex flex-col gap-1 p-4">
                      <p className="font-semibold">{eintrag.mittel}</p>
                      <p className="text-sm text-muted-foreground">
                        Zuletzt {formatTime(new Date(eintrag.letzteGabeAt))}
                        {dosis({ doseMl: eintrag.letzteGabeMl, doseMg: eintrag.letzteGabeMg })
                          ? ` · ${dosis({ doseMl: eintrag.letzteGabeMl, doseMg: eintrag.letzteGabeMg })}`
                          : ''}
                      </p>
                      {eintrag.fruehestensText ? (
                        <p className="text-sm">
                          Nächste Dosis frühestens ab {eintrag.fruehestensText} ·{' '}
                          <span className="text-muted-foreground">{restText(rest)}</span>
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Kein Intervall eingetragen – dann erinnert die App auch an keines.
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        {eintrag.imLetztenTag}{' '}
                        {eintrag.imLetztenTag === 1 ? 'Gabe' : 'Gaben'} in den letzten 24 Stunden
                      </p>
                    </CardContent>
                  </Card>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <Arztzettel daten={daten} />

      <MedicalDisclaimer>
        Die App rechnet keine Dosierungen aus und prüft keine Höchstmengen. Bei hohem oder lang
        anhaltendem Fieber, bei einem Säugling unter drei Monaten oder wenn euch etwas
        beunruhigt: Ärztin anrufen, nicht nachlesen.
      </MedicalDisclaimer>
    </div>
  )
}

/**
 * Der Zettel fuer die Ordination: eine Seite, schwarz auf weiss, alles drauf,
 * was gefragt wird. Kein Logo, keine Werbung – das Papier gehoert der Aerztin.
 */
function Arztzettel({ daten }: { daten: FieberDaten }) {
  const beginn = new Date(daten.beginn)

  return (
    <section className="rounded-xl border border-border p-4 print:border-0 print:p-0">
      <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold print:hidden">
        <Thermometer className="size-4" aria-hidden />
        Zettel für die Ordination
      </h2>

      <PrintHeader kopf={daten.kopf} />

      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <div>
          <dt className="text-muted-foreground">Fieber seit</dt>
          <dd className="font-semibold">{formatDateLong(beginn)}, {formatTime(beginn)}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-muted-foreground">Höchste Temperatur</dt>
          <dd className="font-semibold">
            {daten.hoechste
              ? `${grad(daten.hoechste.temperatureC)} am ${formatDateLong(new Date(daten.hoechste.at))} um ${formatTime(new Date(daten.hoechste.at))}${
                  daten.hoechste.ort ? ` (${MESSORT_LABEL[daten.hoechste.ort]})` : ''
                }`
              : '—'}
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="text-muted-foreground">Letzte 24 Stunden</dt>
          <dd className="font-semibold">
            {daten.tag.trinkmengeMl > 0 ? `${daten.tag.trinkmengeMl} ml aus der Flasche` : 'keine Flasche'}
            {daten.tag.stillminuten > 0 ? ` · ${daten.tag.stillminuten} Min gestillt` : ''} ·{' '}
            {daten.tag.windelnNass} nasse, {daten.tag.windelnStuhl} volle Windeln
          </dd>
        </div>
      </dl>

      <Tabelle titel="Messungen" leer="keine Messungen">
        {daten.messungen.map((m: MessungView) => (
          <tr key={m.id} className="border-b border-border last:border-b-0">
            <td className="py-1 pr-3 align-top">{formatDateTime(new Date(m.at))}</td>
            <td className="py-1 pr-3 align-top">{grad(m.temperatureC)}</td>
            <td className="py-1 pr-3 align-top">{m.ort ? MESSORT_LABEL[m.ort] : '—'}</td>
            <td className="py-1 align-top">{m.note ?? ''}</td>
          </tr>
        ))}
      </Tabelle>

      <Tabelle titel="Medikamente" leer="keine Gaben">
        {daten.gaben.map((g: GabeView) => (
          <tr key={g.id} className="border-b border-border last:border-b-0">
            <td className="py-1 pr-3 align-top">{formatDateTime(new Date(g.at))}</td>
            <td className="py-1 pr-3 align-top">{g.mittel}</td>
            <td className="py-1 pr-3 align-top">{dosis(g) || '—'}</td>
            <td className="py-1 align-top">{g.note ?? ''}</td>
          </tr>
        ))}
      </Tabelle>

      <div className="mt-3">
        <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
          Symptome
        </h3>
        {daten.symptome.length === 0 ? (
          <p className="text-sm">keine eingetragen</p>
        ) : (
          <ul className="text-sm">
            {daten.symptome.map((s) => (
              <li key={s.id}>
                {formatDateTime(new Date(s.at))} · {s.text}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-3">
        <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
          Platz für Notizen
        </h3>
        <div aria-hidden className="mt-1 flex flex-col gap-4">
          <span className="block border-b border-border" />
          <span className="block border-b border-border" />
          <span className="block border-b border-border" />
        </div>
      </div>
    </section>
  )
}

function Tabelle({
  titel,
  leer,
  children,
}: {
  titel: string
  leer: string
  children: React.ReactNode[]
}) {
  return (
    <div className="mt-3">
      <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">{titel}</h3>
      {children.length === 0 ? (
        <p className="text-sm">{leer}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <tbody>{children}</tbody>
          </table>
        </div>
      )}
    </div>
  )
}
