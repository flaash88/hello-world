'use client'
import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Play, Square, Trash2, TriangleAlert } from 'lucide-react'
import {
  deleteContractionAction,
  startContractionAction,
  stopContractionAction,
} from '@/lib/actions/pregnancy-tracking'
import {
  evaluateFourOneOne,
  formatInterval,
  type ContractionInput,
} from '@/lib/pregnancy/contractions'
import { formatDuration, formatStopwatch, formatTime } from '@/lib/time'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { UserAvatar } from '@/components/ui/avatar'
import { useToast } from '@/components/ui/toast'
import { MedicalDisclaimer } from '@/components/medical-disclaimer'
import { cn } from '@/lib/utils'

type Member = { id: string; displayName: string; initials: string; color: string }
type Row = {
  id: string
  startedAt: string
  endedAt: string | null
  intensity: number | null
  createdBy: Member | null
}

export function ContractionTimer({ initial }: { initial: Row[] }) {
  const [rows, setRows] = useState(initial)
  const [now, setNow] = useState(() => Date.now())
  const [pending, startTransition] = useTransition()
  const { toast } = useToast()
  const router = useRouter()

  // Serverdaten gewinnen – sie enthalten auch, was der Partner eingetragen hat.
  useEffect(() => setRows(initial), [initial])

  const running = useMemo(() => rows.find((r) => r.endedAt === null) ?? null, [rows])

  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [running])

  const inputs: ContractionInput[] = useMemo(
    () =>
      rows.map((r) => ({
        startedAt: new Date(r.startedAt),
        endedAt: r.endedAt ? new Date(r.endedAt) : null,
        intensity: r.intensity,
      })),
    [rows],
  )

  const evaluation = useMemo(() => evaluateFourOneOne(inputs, new Date(now)), [inputs, now])

  const toggle = useCallback(() => {
    startTransition(async () => {
      if (running) {
        const result = await stopContractionAction()
        if ('error' in result) {
          toast({ title: 'Nicht gespeichert', description: result.error, variant: 'destructive' })
        } else {
          toast({ title: `Wehe: ${formatDuration(result.durationSec)}` })
        }
      } else {
        const result = await startContractionAction()
        if ('error' in result) {
          toast({ title: 'Nicht gestartet', description: result.error, variant: 'destructive' })
        }
      }
      router.refresh()
    })
  }, [running, router, toast])

  function remove(id: string) {
    startTransition(async () => {
      const result = await deleteContractionAction(id)
      if ('error' in result) {
        toast({ title: 'Nicht gelöscht', description: result.error, variant: 'destructive' })
      } else {
        setRows((prev) => prev.filter((r) => r.id !== id))
        toast({ title: 'Eintrag gelöscht' })
      }
      router.refresh()
    })
  }

  const runningSec = running ? (now - new Date(running.startedAt).getTime()) / 1000 : 0
  const stats = evaluation.stats

  return (
    <div className="flex flex-col gap-4">
      <Button
        size="xl"
        variant={running ? 'destructive' : 'default'}
        onClick={toggle}
        disabled={pending}
        className="h-40 w-full flex-col gap-1 rounded-2xl text-2xl"
      >
        {running ? <Square className="size-8" aria-hidden /> : <Play className="size-8" aria-hidden />}
        <span>{running ? 'Wehe beenden' : 'Wehe starten'}</span>
        {running && <span className="tabular text-4xl font-bold">{formatStopwatch(runningSec)}</span>}
      </Button>

      <Card className={cn(evaluation.met && 'border-destructive')}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            {evaluation.met && <TriangleAlert className="size-5 text-destructive" aria-hidden />}
            4-1-1-Auswertung
          </CardTitle>
          <CardDescription>{evaluation.summary}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            <Stat label="Abstand" value={formatInterval(stats.medianIntervalSec)} ok={evaluation.intervalOk} />
            <Stat
              label="Dauer"
              value={stats.medianDurationSec === null ? '–' : formatDuration(stats.medianDurationSec, { short: true })}
              ok={evaluation.durationOk}
            />
            <Stat
              label="seit"
              value={stats.spanSec > 0 ? formatDuration(stats.spanSec, { short: true }) : '–'}
              ok={evaluation.spanOk}
            />
          </div>
          {stats.count > 0 && (
            <p className="text-xs text-muted-foreground">
              {stats.count} abgeschlossene {stats.count === 1 ? 'Wehe' : 'Wehen'} in der letzten
              Stunde
              {stats.minIntervalSec !== null &&
                stats.maxIntervalSec !== null &&
                ` · Abstände zwischen ${formatInterval(stats.minIntervalSec)} und ${formatInterval(stats.maxIntervalSec)}`}
            </p>
          )}
          <MedicalDisclaimer>
            Die 4-1-1-Regel ist eine Faustregel, keine Entscheidung. Ruf bei deiner Hebamme oder in
            der Klinik an, wenn du unsicher bist, starke Schmerzen hast, Blut oder Fruchtwasser
            abgeht oder du weniger Bewegungen spürst – unabhängig davon, was hier steht.
          </MedicalDisclaimer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Verlauf</CardTitle>
          <CardDescription>Die letzten 12 Stunden</CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Noch nichts aufgezeichnet.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {rows.map((row, index) => {
                const start = new Date(row.startedAt)
                const end = row.endedAt ? new Date(row.endedAt) : null
                const previous = rows[index + 1]
                const gapSec = previous
                  ? (start.getTime() - new Date(previous.startedAt).getTime()) / 1000
                  : null
                return (
                  <li key={row.id} className="flex items-center gap-3 py-2.5">
                    <span className="tabular w-14 shrink-0 font-semibold">{formatTime(start)}</span>
                    <span className="tabular flex-1">
                      {end ? formatDuration((end.getTime() - start.getTime()) / 1000, { short: true }) : 'läuft …'}
                      {gapSec !== null && (
                        <span className="ml-2 text-sm text-muted-foreground">
                          Abstand {formatInterval(gapSec)}
                        </span>
                      )}
                    </span>
                    {row.createdBy && (
                      <UserAvatar
                        size="sm"
                        initials={row.createdBy.initials}
                        color={row.createdBy.color}
                        title={`Eingetragen von ${row.createdBy.displayName}`}
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => remove(row.id)}
                      disabled={pending}
                      aria-label={`Wehe um ${formatTime(start)} löschen`}
                      className="flex size-12 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-destructive"
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Stat({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="rounded-xl bg-muted p-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="tabular font-display text-lg font-bold">{value}</p>
      <Badge variant={ok ? 'default' : 'muted'} className="mt-1">
        {ok ? 'erfüllt' : 'offen'}
      </Badge>
    </div>
  )
}
