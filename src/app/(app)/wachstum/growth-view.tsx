'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Scatter,
  ComposedChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Plus, Ruler, Trash2 } from 'lucide-react'
import {
  CURVE_PERCENTILES,
  INDICATOR_LABEL,
  LENGTH_HEIGHT_TRANSITION_DAY,
  describePercentile,
  shortPercentile,
  type CurvePoint,
  type GrowthResult,
  type Indicator,
} from '@/lib/growth'
import { deleteMeasurementAction, saveMeasurementAction } from '@/lib/actions/growth'
import { formatDateShort } from '@/lib/time'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { UnitStepper } from '@/components/tracker/unit-stepper'
import { useUnits } from '@/components/units-provider'
import { formatUnit, toDisplay, unitLabel, type UnitKind, type UnitPrefs } from '@/lib/units'
import { useToast } from '@/components/ui/toast'
import { MedicalDisclaimer } from '@/components/medical-disclaimer'
import { EmptyState } from '@/components/ui/empty-state'

type Point = {
  id: string
  measuredAt: string
  ageDays: number
  correctedFromDays: number | null
  weightKg: number | null
  lengthCm: number | null
  headCm: number | null
  bmi: number | null
  note: string | null
  results: Record<Indicator, GrowthResult | null>
}

const INDICATORS: Indicator[] = ['weight', 'length', 'head', 'bmi']

const CURVE_STYLE: Record<number, { color: string; dash?: string }> = {
  3: { color: 'hsl(var(--muted-foreground))', dash: '3 3' },
  15: { color: 'hsl(var(--muted-foreground))', dash: '5 3' },
  50: { color: 'hsl(var(--foreground))' },
  85: { color: 'hsl(var(--muted-foreground))', dash: '5 3' },
  97: { color: 'hsl(var(--muted-foreground))', dash: '3 3' },
}

/**
 * BMI bleibt kg/m²: Eine Umrechnung auf lb/in² kennt niemand, und die WHO
 * gibt den Wert nur metrisch an. Alles andere folgt der Einstellung.
 */
function indicatorKind(indicator: Indicator): UnitKind | null {
  if (indicator === 'bmi') return null
  return indicator === 'weight' ? 'weight' : 'length'
}

function formatIndicator(indicator: Indicator, value: number, units: UnitPrefs): string {
  const kind = indicatorKind(indicator)
  if (!kind) return `${value.toLocaleString('de-AT', { maximumFractionDigits: 1 })} kg/m²`
  return formatUnit(kind, value, units)
}

function indicatorUnitLabel(indicator: Indicator, units: UnitPrefs): string {
  const kind = indicatorKind(indicator)
  return kind ? unitLabel(kind, units) : 'kg/m²'
}

/** Kurvenwerte fuer die Anzeige umrechnen – gerechnet wird weiter metrisch. */
function displayCurve(indicator: Indicator, curve: CurvePoint[], units: UnitPrefs): CurvePoint[] {
  const kind = indicatorKind(indicator)
  if (!kind) return curve
  return curve.map((point) => {
    const next: CurvePoint = { ageDays: point.ageDays }
    for (const [key, value] of Object.entries(point)) {
      if (key === 'ageDays') continue
      next[key] = toDisplay(kind, value, units)
    }
    return next
  })
}

export function GrowthView({
  childId,
  childName,
  sexKnown,
  hasCorrectedAge,
  currentAgeDays,
  points,
  curves,
}: {
  childId: string
  childName: string
  sexKnown: boolean
  hasCorrectedAge: boolean
  currentAgeDays: number
  points: Point[]
  curves: Record<Indicator, CurvePoint[]>
}) {
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<Point | null>(null)
  const [pending, startTransition] = useTransition()
  const units = useUnits()
  const { toast } = useToast()
  const router = useRouter()

  const latest = points[points.length - 1] ?? null

  function remove(id: string) {
    startTransition(async () => {
      const result = await deleteMeasurementAction(id)
      if ('error' in result) {
        toast({ title: 'Nicht gelöscht', description: result.error, variant: 'destructive' })
      } else {
        toast({ title: 'Messung gelöscht' })
      }
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl font-bold">Wachstum</h1>

      <Button size="lg" onClick={() => setAdding(true)}>
        <Plus aria-hidden />
        Messung eintragen
      </Button>

      {!sexKnown && (
        <p className="rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">
          Für {childName} ist kein Geschlecht hinterlegt. Die Kurven zeigen deshalb die
          Mädchen-Referenz – die Perzentile stimmen für einen Buben dann nicht.
        </p>
      )}

      {latest && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Zuletzt gemessen</CardTitle>
            <CardDescription>
              {formatDateShort(new Date(latest.measuredAt))} · {Math.round(latest.ageDays / 7)} Wochen alt
              {latest.correctedFromDays !== null && ' (korrigiertes Alter)'}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            {INDICATORS.map((indicator) => {
              const result = latest.results[indicator]
              const raw =
                indicator === 'weight'
                  ? latest.weightKg
                  : indicator === 'length'
                    ? latest.lengthCm
                    : indicator === 'head'
                      ? latest.headCm
                      : latest.bmi
              if (raw === null || !result) return null
              return (
                <div key={indicator} className="rounded-xl border border-border p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {INDICATOR_LABEL[indicator]}
                  </p>
                  <p className="tabular font-display text-xl font-bold">
                    {formatIndicator(indicator, raw, units)}
                  </p>
                  <Badge variant="secondary" className="mt-1">
                    {shortPercentile(result.percentile)}
                  </Badge>
                  {result.outOfRange && (
                    <p className="mt-1 text-xs text-muted-foreground">außerhalb der WHO-Tabelle</p>
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {points.length === 0 ? (
        <EmptyState
          icon={Ruler}
          title="Noch keine Messung"
          description="Trage Gewicht, Länge oder Kopfumfang ein – meist gibt es die Werte beim Mutter-Kind-Pass-Termin."
        />
      ) : (
        <Tabs defaultValue="weight">
          <TabsList className="w-full">
            {INDICATORS.map((indicator) => (
              <TabsTrigger key={indicator} value={indicator}>
                {INDICATOR_LABEL[indicator]}
              </TabsTrigger>
            ))}
          </TabsList>

          {INDICATORS.map((indicator) => {
            const measured = points
              .filter((point) => point.results[indicator] !== null)
              .map((point) => ({
                ageDays: point.ageDays,
                value: (() => {
                  const kind = indicatorKind(indicator)
                  const value = point.results[indicator]!.value
                  return kind ? toDisplay(kind, value, units) : value
                })(),
              }))

            return (
              <TabsContent key={indicator} value={indicator}>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      {INDICATOR_LABEL[indicator]} nach WHO-Standard
                    </CardTitle>
                    <CardDescription>
                      Kurven P3, P15, P50, P85 und P97 · eure Messungen als Punkte
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart
                        data={displayCurve(indicator, curves[indicator], units)}
                        margin={{ top: 4, right: 8, bottom: 4, left: -22 }}
                      >
                        <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                        <XAxis
                          dataKey="ageDays"
                          type="number"
                          domain={[0, 'dataMax']}
                          tickFormatter={(value: number) =>
                            value >= 365 ? `${Math.round(value / 30.4)}M` : `${Math.round(value / 30.4)}M`
                          }
                          tick={{ fontSize: 11 }}
                          stroke="hsl(var(--muted-foreground))"
                        />
                        <YAxis
                          domain={['dataMin', 'dataMax']}
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
                          labelFormatter={(value) => `${Math.round(Number(value) / 30.4)} Monate`}
                          formatter={(value, name) => [
                            `${Number(value).toLocaleString('de-AT', { maximumFractionDigits: 2 })} ${indicatorUnitLabel(indicator, units)}`,
                            String(name),
                          ]}
                        />
                        {CURVE_PERCENTILES.map((percentile) => (
                          <Line
                            key={percentile}
                            type="monotone"
                            dataKey={`p${percentile}`}
                            name={`P${percentile}`}
                            stroke={CURVE_STYLE[percentile]!.color}
                            strokeDasharray={CURVE_STYLE[percentile]!.dash}
                            strokeWidth={percentile === 50 ? 2 : 1}
                            dot={false}
                            isAnimationActive={false}
                          />
                        ))}
                        <Scatter
                          data={measured}
                          dataKey="value"
                          name={childName}
                          fill="hsl(var(--primary))"
                          line={{ stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
                          isAnimationActive={false}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {indicator === 'length' && currentAgeDays >= LENGTH_HEIGHT_TRANSITION_DAY - 60 && (
                  <p className="mt-2 rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground">
                    Ab 24 Monaten misst die WHO im Stehen statt im Liegen. Deshalb macht die
                    Referenzkurve dort einen Sprung von etwa 0,7 cm nach unten – das ist so gewollt
                    und kein Messfehler.
                  </p>
                )}
              </TabsContent>
            )
          })}
        </Tabs>
      )}

      {points.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Alle Messungen</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col divide-y divide-border">
              {[...points].reverse().map((point) => (
                <li key={point.id} className="flex items-start gap-2 py-3">
                  <button
                    type="button"
                    onClick={() => setEditing(point)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="text-sm text-muted-foreground">
                      {formatDateShort(new Date(point.measuredAt))} ·{' '}
                      {Math.round(point.ageDays / 7)} Wochen
                    </p>
                    <p className="tabular font-semibold">
                      {[
                        point.weightKg !== null && formatUnit('weight', point.weightKg, units),
                        point.lengthCm !== null && formatUnit('length', point.lengthCm, units),
                        point.headCm !== null && `KU ${formatUnit('length', point.headCm, units)}`,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                    {point.results.weight && (
                      <p className="text-xs text-muted-foreground">
                        Gewicht {describePercentile(point.results.weight.percentile)}
                      </p>
                    )}
                    {point.note && <p className="mt-0.5 text-sm">{point.note}</p>}
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(point.id)}
                    disabled={pending}
                    aria-label="Messung löschen"
                    className="flex size-12 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-destructive"
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <MedicalDisclaimer>
        Perzentile sind eine Einordnung, keine Bewertung. Ein Kind auf P5 ist genauso gesund wie
        eines auf P95, solange es seiner eigenen Kurve folgt. Auffällig ist der Verlauf, nicht der
        einzelne Punkt – besprecht das bei der Vorsorgeuntersuchung.
        {hasCorrectedAge && ' Bei Frühgeburt rechnet Sprössling bis zwei Jahre mit dem korrigierten Alter.'}
      </MedicalDisclaimer>

      <MeasurementDialog
        childId={childId}
        point={editing}
        open={adding || editing !== null}
        onOpenChange={(next) => {
          if (!next) {
            setAdding(false)
            setEditing(null)
          }
        }}
      />
    </div>
  )
}

function MeasurementDialog({
  childId,
  point,
  open,
  onOpenChange,
}: {
  childId: string
  point: Point | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [weight, setWeight] = useState<number | null>(null)
  const [length, setLength] = useState<number | null>(null)
  const [head, setHead] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const { toast } = useToast()
  const router = useRouter()

  // Beim Öffnen die Werte des bearbeiteten Punkts uebernehmen.
  const [loadedFor, setLoadedFor] = useState<string | null>(null)
  if (open && loadedFor !== (point?.id ?? 'new')) {
    setWeight(point?.weightKg ?? null)
    setLength(point?.lengthCm ?? null)
    setHead(point?.headCm ?? null)
    setError(null)
    setLoadedFor(point?.id ?? 'new')
  }
  if (!open && loadedFor !== null) setLoadedFor(null)

  function submit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await saveMeasurementAction({
        id: point?.id,
        childId,
        measuredAt: String(formData.get('measuredAt') ?? ''),
        weightKg: weight,
        lengthCm: length,
        headCm: head,
        note: String(formData.get('note') ?? ''),
      })
      if ('error' in result) {
        setError(result.error)
        return
      }
      toast({ title: 'Gespeichert' })
      onOpenChange(false)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{point ? 'Messung bearbeiten' : 'Messung eintragen'}</DialogTitle>
        </DialogHeader>
        <form action={submit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="measuredAt">Gemessen am</Label>
            <Input
              id="measuredAt"
              name="measuredAt"
              type="datetime-local"
              required
              defaultValue={toLocalInput(point?.measuredAt ?? new Date().toISOString())}
            />
          </div>
          <UnitStepper
            kind="weight"
            id="weightKg"
            label="Gewicht"
            min={0.3}
            max={60}
            placeholder="5,20"
            value={weight}
            onChange={setWeight}
          />
          <UnitStepper
            kind="length"
            id="lengthCm"
            label="Länge"
            min={20}
            max={160}
            placeholder="58,0"
            value={length}
            onChange={setLength}
          />
          <UnitStepper
            kind="length"
            id="headCm"
            label="Kopfumfang"
            min={20}
            max={70}
            placeholder="39,0"
            value={head}
            onChange={setHead}
          />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="note">Notiz</Label>
            <Textarea id="note" name="note" rows={2} defaultValue={point?.note ?? ''} />
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

function toLocalInput(iso: string): string {
  const date = new Date(iso)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}
