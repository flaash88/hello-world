'use client'
import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2 } from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { deleteMaternalLogAction, saveMaternalLogAction } from '@/lib/actions/pregnancy-tracking'
import { formatDateShort, formatDateTime } from '@/lib/time'
import { formatWeight, fromDisplay, roundedDisplay, unitLabel } from '@/lib/units'
import { useUnits } from '@/components/units-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { UserAvatar } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { MedicalDisclaimer } from '@/components/medical-disclaimer'
import { cn } from '@/lib/utils'

type Member = { id: string; displayName: string; initials: string; color: string }
type Log = {
  id: string
  recordedAt: string
  weightKg: number | null
  systolic: number | null
  diastolic: number | null
  pulse: number | null
  symptoms: string[]
  note: string | null
  createdBy: Member | null
}

/** Haeufige Symptome als Schnellauswahl – Freitext bleibt zusaetzlich moeglich. */
const COMMON_SYMPTOMS = [
  'Übelkeit',
  'Sodbrennen',
  'Rückenschmerzen',
  'Kopfschmerzen',
  'Schwindel',
  'Wassereinlagerungen',
  'Kurzatmigkeit',
  'Schlaflosigkeit',
  'Wadenkrämpfe',
  'Ziehen im Unterleib',
  'Übungswehen',
  'Erschöpfung',
]

export function MaternalLogView({ logs }: { logs: Log[] }) {
  const [open, setOpen] = useState(false)
  const units = useUnits()
  const [pending, startTransition] = useTransition()
  const { toast } = useToast()
  const router = useRouter()

  const weightSeries = useMemo(
    () =>
      logs
        .filter((l) => l.weightKg !== null)
        .map((l) => ({ t: new Date(l.recordedAt).getTime(), kg: roundedDisplay('weight', l.weightKg!, units) }))
        .sort((a, b) => a.t - b.t),
    [logs, units],
  )

  const bpSeries = useMemo(
    () =>
      logs
        .filter((l) => l.systolic !== null && l.diastolic !== null)
        .map((l) => ({ t: new Date(l.recordedAt).getTime(), sys: l.systolic!, dia: l.diastolic! }))
        .sort((a, b) => a.t - b.t),
    [logs],
  )

  function remove(id: string) {
    startTransition(async () => {
      const result = await deleteMaternalLogAction(id)
      if ('error' in result) {
        toast({ title: 'Nicht gelöscht', description: result.error, variant: 'destructive' })
      } else {
        toast({ title: 'Eintrag gelöscht' })
      }
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <Button size="lg" onClick={() => setOpen(true)}>
        <Plus aria-hidden />
        Werte eintragen
      </Button>

      {weightSeries.length >= 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Gewicht</CardTitle>
            <CardDescription>{weightSeries.length} Messungen</CardDescription>
          </CardHeader>
          <CardContent className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weightSeries} margin={{ top: 4, right: 8, bottom: 4, left: -20 }}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                <XAxis
                  dataKey="t"
                  type="number"
                  domain={['dataMin', 'dataMax']}
                  tickFormatter={(v: number) => formatDateShort(new Date(v))}
                  tick={{ fontSize: 11 }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis
                  domain={['dataMin - 1', 'dataMax + 1']}
                  tick={{ fontSize: 11 }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <Tooltip
                  labelFormatter={(v) => formatDateShort(new Date(Number(v)))}
                  formatter={(value) => [`${value} ${unitLabel('weight', units)}`, 'Gewicht']}
                  contentStyle={{
                    background: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '0.75rem',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="kg"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {bpSeries.length >= 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Blutdruck</CardTitle>
            <CardDescription>Systolisch und diastolisch</CardDescription>
          </CardHeader>
          <CardContent className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={bpSeries} margin={{ top: 4, right: 8, bottom: 4, left: -20 }}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                <XAxis
                  dataKey="t"
                  type="number"
                  domain={['dataMin', 'dataMax']}
                  tickFormatter={(v: number) => formatDateShort(new Date(v))}
                  tick={{ fontSize: 11 }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  labelFormatter={(v) => formatDateShort(new Date(Number(v)))}
                  contentStyle={{
                    background: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '0.75rem',
                  }}
                />
                <Line type="monotone" dataKey="sys" name="systolisch" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="dia" name="diastolisch" stroke="hsl(var(--cat-sleep))" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Verlauf</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Noch nichts eingetragen.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {logs.map((log) => (
                <li key={log.id} className="flex items-start gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-muted-foreground">
                      {formatDateTime(new Date(log.recordedAt))}
                    </p>
                    <p className="tabular font-semibold">
                      {[
                        log.weightKg !== null && formatWeight(log.weightKg, units),
                        log.systolic !== null && log.diastolic !== null && `${log.systolic}/${log.diastolic} mmHg`,
                        log.pulse !== null && `${log.pulse} bpm`,
                      ]
                        .filter(Boolean)
                        .join(' · ') || 'Nur Symptome'}
                    </p>
                    {log.symptoms.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {log.symptoms.map((s) => (
                          <Badge key={s} variant="secondary">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {log.note && <p className="mt-1 text-sm">{log.note}</p>}
                  </div>
                  {log.createdBy && (
                    <UserAvatar
                      size="sm"
                      initials={log.createdBy.initials}
                      color={log.createdBy.color}
                      title={`Eingetragen von ${log.createdBy.displayName}`}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => remove(log.id)}
                    disabled={pending}
                    aria-label="Eintrag löschen"
                    className="flex size-12 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-destructive"
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <MedicalDisclaimer>
        Plötzliche starke Wassereinlagerungen, Kopfschmerzen mit Sehstörungen oder ein Blutdruck
        über 140/90 gehören ärztlich abgeklärt – nicht abwarten, sondern anrufen.
      </MedicalDisclaimer>

      <MaternalLogDialog open={open} onOpenChange={setOpen} />
    </div>
  )
}

function MaternalLogDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [symptoms, setSymptoms] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const units = useUnits()
  const [pending, startTransition] = useTransition()
  const { toast } = useToast()
  const router = useRouter()

  function toggleSymptom(symptom: string) {
    setSymptoms((prev) =>
      prev.includes(symptom) ? prev.filter((s) => s !== symptom) : [...prev, symptom],
    )
  }

  function submit(formData: FormData) {
    setError(null)
    const num = (key: string): number | null => {
      const raw = String(formData.get(key) ?? '').trim().replace(',', '.')
      if (!raw) return null
      const value = Number(raw)
      return Number.isFinite(value) ? value : null
    }
    const extra = String(formData.get('extraSymptom') ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    startTransition(async () => {
      const result = await saveMaternalLogAction({
        recordedAt: String(formData.get('recordedAt') ?? '') || undefined,
        // Eingegeben wird in der eingestellten Einheit, gespeichert in kg.
        weightKg: (() => {
          const value = num('weightKg')
          return value === null ? null : fromDisplay('weight', value, units)
        })(),
        systolic: num('systolic'),
        diastolic: num('diastolic'),
        pulse: num('pulse'),
        symptoms: [...symptoms, ...extra],
        note: String(formData.get('note') ?? ''),
      })
      if ('error' in result) {
        setError(result.error)
        return
      }
      toast({ title: 'Gespeichert' })
      setSymptoms([])
      onOpenChange(false)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Werte eintragen</DialogTitle>
        </DialogHeader>
        <form action={submit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="recordedAt">Zeitpunkt</Label>
            <Input id="recordedAt" name="recordedAt" type="datetime-local" defaultValue={localNow()} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="weightKg">Gewicht ({unitLabel('weight', units)})</Label>
              <Input id="weightKg" name="weightKg" inputMode="decimal" placeholder="68,4" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pulse">Puls</Label>
              <Input id="pulse" name="pulse" inputMode="numeric" placeholder="76" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="systolic">Blutdruck oben</Label>
              <Input id="systolic" name="systolic" inputMode="numeric" placeholder="118" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="diastolic">Blutdruck unten</Label>
              <Input id="diastolic" name="diastolic" inputMode="numeric" placeholder="74" />
            </div>
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-semibold text-muted-foreground">Symptome</legend>
            <div className="flex flex-wrap gap-2">
              {COMMON_SYMPTOMS.map((symptom) => {
                const active = symptoms.includes(symptom)
                return (
                  <button
                    key={symptom}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleSymptom(symptom)}
                    className={cn(
                      'min-h-12 rounded-full border-2 px-3 text-sm font-semibold',
                      active ? 'border-primary bg-primary/10 text-primary' : 'border-border',
                    )}
                  >
                    {symptom}
                  </button>
                )
              })}
            </div>
            <Input name="extraSymptom" placeholder="Weitere, mit Komma getrennt" />
          </fieldset>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="note">Notiz</Label>
            <Textarea id="note" name="note" rows={3} />
          </div>

          {error && <p className="text-sm font-medium text-destructive">{error}</p>}
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? 'Speichert …' : 'Speichern'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** "YYYY-MM-DDTHH:MM" fuer datetime-local in der Zeitzone des Geraets. */
function localNow(): string {
  const now = new Date()
  const offsetMs = now.getTimezoneOffset() * 60_000
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 16)
}
