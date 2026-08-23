'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Check, Scale } from 'lucide-react'
import {
  ERWARTBAR_BIS_PROZENT,
  HINWEIS_AB_PROZENT,
  VERLAUF_TAGE,
  ZURUECK_BIS_LEBENSTAG,
  grammText,
  prozentText,
} from '@/lib/growth/newborn'
import { saveMeasurementAction } from '@/lib/actions/growth'
import { formatGrams } from '@/lib/units'
import { useUnits } from '@/components/units-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { MedicalDisclaimer } from '@/components/medical-disclaimer'

export type NewbornPunkt = {
  lebenstag: number
  weightG: number
  prozent: number
  differenzG: number
  datumText: string
}

export type NewbornDaten = {
  childId: string
  childName: string
  birthWeightG: number
  dischargeWeightG: number | null
  lebenstagHeute: number
  punkte: NewbornPunkt[]
  aktuell: NewbornPunkt | null
  tiefstwert: NewbornPunkt | null
  zurueckAm: NewbornPunkt | null
  zunahmeGProTag: number | null
  hebammeAnsprechen: boolean
  hebammeGrund: 'verlust' | 'dauer' | null
}

/**
 * Die ersten sechs Wochen. Hier zaehlt nicht das Perzentil, sondern die Frage,
 * ob das Kind wieder auf sein Geburtsgewicht kommt – und die beantwortet sich
 * am besten mit einer Linie und drei Zahlen.
 */
export function NewbornView({ daten }: { daten: NewbornDaten }) {
  const [eintragen, setEintragen] = useState(false)
  const units = useUnits()
  const gramm = (value: number) => formatGrams(value, units)

  const zurueck = daten.zurueckAm !== null

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold">Gewicht</h1>
        <p className="text-muted-foreground">
          Lebenstag {daten.lebenstagHeute} · Geburtsgewicht {gramm(daten.birthWeightG)}
          {daten.dischargeWeightG !== null
            ? ` · bei Entlassung ${gramm(daten.dischargeWeightG)}`
            : ''}
        </p>
      </div>

      <Button size="lg" onClick={() => setEintragen(true)}>
        <Scale aria-hidden />
        Gewicht eintragen
      </Button>

      {daten.aktuell ? (
        <Card>
          <CardContent className="grid grid-cols-3 gap-3 p-4 text-center">
            <Kennzahl label="Aktuell" wert={gramm(daten.aktuell.weightG)} />
            <Kennzahl
              label="Zum Geburtsgewicht"
              wert={grammText(daten.aktuell.differenzG)}
              // Ist das Geburtsgewicht wieder da, tritt die Prozentanzeige zurück.
              zusatz={zurueck ? undefined : prozentText(daten.aktuell.prozent)}
            />
            <Kennzahl label="Lebenstag" wert={String(daten.aktuell.lebenstag)} />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            Noch keine Messung. Sobald ihr das erste Mal wiegt, entsteht hier der Verlauf.
          </CardContent>
        </Card>
      )}

      {zurueck && (
        <Card className="border-primary/40">
          <CardContent className="flex items-start gap-3 p-4">
            <Check className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
            <div>
              <p className="font-semibold">Geburtsgewicht wieder erreicht</p>
              <p className="text-sm text-muted-foreground">
                Am {daten.zurueckAm!.datumText}, an Lebenstag {daten.zurueckAm!.lebenstag}.
                {daten.tiefstwert && daten.tiefstwert.lebenstag < daten.zurueckAm!.lebenstag
                  ? ` Der tiefste Wert lag bei ${gramm(daten.tiefstwert.weightG)} an Tag ${daten.tiefstwert.lebenstag}.`
                  : ''}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-3">
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={daten.punkte}
                margin={{ top: 8, right: 8, bottom: 4, left: -12 }}
              >
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                <XAxis
                  dataKey="lebenstag"
                  type="number"
                  domain={[0, VERLAUF_TAGE]}
                  ticks={[0, 7, 14, 21, 28]}
                  tickFormatter={(value: number) => `T${value}`}
                  tick={{ fontSize: 11 }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis
                  domain={['dataMin - 100', 'dataMax + 100']}
                  tick={{ fontSize: 11 }}
                  stroke="hsl(var(--muted-foreground))"
                  width={48}
                />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '0.75rem',
                    fontSize: '0.8125rem',
                  }}
                  labelFormatter={(value) => `Lebenstag ${value}`}
                  formatter={(value) => [gramm(Number(value)), 'Gewicht']}
                />

                {/* Geburtsgewicht als Bezugslinie, die beiden Prozentmarken dezent. */}
                <ReferenceLine
                  y={daten.birthWeightG}
                  stroke="hsl(var(--primary))"
                  strokeWidth={1.5}
                  label={{ value: 'Geburtsgewicht', position: 'insideTopRight', fontSize: 10 }}
                />
                <ReferenceLine
                  y={Math.round(daten.birthWeightG * (1 + ERWARTBAR_BIS_PROZENT / 100))}
                  stroke="hsl(var(--muted-foreground))"
                  strokeDasharray="4 4"
                  label={{ value: '−7 %', position: 'insideBottomRight', fontSize: 10 }}
                />
                <ReferenceLine
                  y={Math.round(daten.birthWeightG * (1 + HINWEIS_AB_PROZENT / 100))}
                  stroke="hsl(var(--muted-foreground))"
                  strokeDasharray="4 4"
                  label={{ value: '−10 %', position: 'insideBottomRight', fontSize: 10 }}
                />

                <Line
                  type="monotone"
                  dataKey="weightG"
                  stroke="hsl(var(--foreground))"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {(daten.tiefstwert || daten.zunahmeGProTag !== null) && (
        <Card>
          <CardContent className="flex flex-col gap-1 p-4 text-sm">
            {daten.tiefstwert && (
              <p>
                <span className="font-semibold">Tiefster Wert:</span>{' '}
                {gramm(daten.tiefstwert.weightG)} an Lebenstag {daten.tiefstwert.lebenstag}
                {zurueck ? '' : ` (${prozentText(daten.tiefstwert.prozent)})`}
              </p>
            )}
            {daten.zunahmeGProTag !== null && (
              <p>
                <span className="font-semibold">Seit dem Tiefstwert:</span>{' '}
                {grammText(daten.zunahmeGProTag)} pro Tag im Schnitt
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {daten.hebammeAnsprechen && (
        <Card>
          <CardContent className="p-4 text-sm">
            {daten.hebammeGrund === 'verlust' ? (
              <p>
                {daten.childName} liegt derzeit mehr als 10 % unter dem Geburtsgewicht. Das kommt
                vor und sagt für sich genommen wenig – sprich es beim nächsten Hausbesuch an, dann
                schaut die Hebamme sich das gemeinsam mit euch an.
              </p>
            ) : (
              <p>
                Das Geburtsgewicht ist bis Lebenstag {ZURUECK_BIS_LEBENSTAG} noch nicht wieder
                erreicht. Auch das kommt vor. Erwähn es bei der Hebamme, sie kann einordnen, ob es
                etwas braucht.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <MedicalDisclaimer>
        Diese Ansicht rechnet, sie beurteilt nicht. Wie es {daten.childName} geht, sieht man am
        Kind – und einordnen kann das eure Hebamme oder Kinderärztin.
      </MedicalDisclaimer>

      <GewichtDialog childId={daten.childId} open={eintragen} onOpenChange={setEintragen} />
    </div>
  )
}

function Kennzahl({ label, wert, zusatz }: { label: string; wert: string; zusatz?: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-display text-lg font-bold tabular">{wert}</p>
      {zusatz && <p className="text-sm text-muted-foreground tabular">{zusatz}</p>}
    </div>
  )
}

/** Ein Tap auf „Gewicht eintragen“, Zahl tippen, speichern. Mehr nicht. */
function GewichtDialog({
  childId,
  open,
  onOpenChange,
}: {
  childId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const { toast } = useToast()
  const router = useRouter()

  function submit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const gramme = Number(formData.get('weightG') ?? 0)
      if (!Number.isFinite(gramme) || gramme <= 0) {
        setError('Bitte ein Gewicht in Gramm eintragen.')
        return
      }
      const result = await saveMeasurementAction({
        childId,
        measuredAt: new Date().toISOString(),
        // Gespeichert wird weiter in Kilogramm – hier wird nur eingegeben.
        weightKg: Math.round(gramme) / 1000,
      })
      if ('error' in result) {
        setError(result.error)
        return
      }
      toast({ title: 'Eingetragen' })
      onOpenChange(false)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Gewicht eintragen</DialogTitle>
        </DialogHeader>
        <form action={submit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="newbornWeight">Gewicht (g)</Label>
            <Input
              id="newbornWeight"
              name="weightG"
              type="number"
              inputMode="numeric"
              min={200}
              max={8000}
              required
              autoFocus
              className="text-center text-2xl font-semibold tabular"
            />
          </div>
          {error && (
            <p role="alert" data-testid="form-error" className="text-sm font-medium text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? 'Speichert …' : 'Speichern'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
