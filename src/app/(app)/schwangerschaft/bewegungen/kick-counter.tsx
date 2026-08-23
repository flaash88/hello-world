'use client'
import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Footprints, RotateCcw } from 'lucide-react'
import { recordKickAction, resetKickSessionAction } from '@/lib/actions/pregnancy-tracking'
import { formatDateShort, formatDuration, formatStopwatch, formatTime } from '@/lib/time'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'
import { MedicalDisclaimer } from '@/components/medical-disclaimer'
import { cn } from '@/lib/utils'

const TARGET = 10

type OpenSession = { id: string; startedAt: string; count: number }
type Past = { id: string; startedAt: string; endedAt: string; count: number }

/**
 * 10-Bewegungen-Zaehlung: Ab dem ersten Tritt laeuft die Uhr, bei zehn
 * gezaehlten Bewegungen ist die Runde vorbei. Die uebliche Orientierung ist,
 * dass zehn Bewegungen innerhalb von zwei Stunden wahrgenommen werden.
 */
export function KickCounter({
  openSession,
  history,
}: {
  openSession: OpenSession | null
  history: Past[]
}) {
  const [session, setSession] = useState(openSession)
  const [now, setNow] = useState(() => Date.now())
  const [pending, startTransition] = useTransition()
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => setSession(openSession), [openSession])

  useEffect(() => {
    if (!session) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [session])

  const count = session?.count ?? 0
  const elapsedSec = session ? (now - new Date(session.startedAt).getTime()) / 1000 : 0

  function kick() {
    startTransition(async () => {
      const result = await recordKickAction()
      if ('error' in result) {
        toast({ title: 'Nicht gezählt', description: result.error, variant: 'destructive' })
        return
      }
      if (result.done) {
        toast({
          title: `${TARGET} Bewegungen gezählt`,
          description: `Gedauert hat es ${formatDuration(
            (Date.now() - new Date(result.startedAt).getTime()) / 1000,
          )}.`,
        })
        setSession(null)
      } else {
        setSession({ id: result.sessionId, startedAt: result.startedAt, count: result.count })
      }
      router.refresh()
    })
  }

  function reset() {
    if (!session) return
    const id = session.id
    startTransition(async () => {
      const result = await resetKickSessionAction(id)
      if ('error' in result) {
        toast({ title: 'Nicht zurückgesetzt', description: result.error, variant: 'destructive' })
      } else {
        setSession(null)
        toast({ title: 'Zählung verworfen' })
      }
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <Button
        size="xl"
        onClick={kick}
        disabled={pending}
        className="h-48 w-full flex-col gap-2 rounded-2xl"
      >
        <Footprints className="size-8" aria-hidden />
        <span className="tabular font-display text-5xl font-bold">
          {count} <span className="text-2xl font-normal opacity-70">/ {TARGET}</span>
        </span>
        <span className="text-base font-normal">Bewegung zählen</span>
      </Button>

      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {session ? (
            <>
              Läuft seit <span className="tabular font-semibold">{formatStopwatch(elapsedSec)}</span>
              {' · '}
              gestartet um {formatTime(new Date(session.startedAt))}
            </>
          ) : (
            'Der erste Tritt startet die Zählung.'
          )}
        </p>
        {session && (
          <Button variant="ghost" size="sm" onClick={reset} disabled={pending}>
            <RotateCcw aria-hidden />
            Verwerfen
          </Button>
        )}
      </div>

      <div className="grid grid-cols-5 gap-2" aria-hidden>
        {Array.from({ length: TARGET }, (_, i) => (
          <div
            key={i}
            className={cn(
              'flex h-12 items-center justify-center rounded-lg border-2 text-sm font-bold',
              i < count ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground',
            )}
          >
            {i + 1}
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Frühere Zählungen</CardTitle>
          <CardDescription>Die letzten abgeschlossenen Runden</CardDescription>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">Noch keine abgeschlossene Zählung.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {history.map((entry) => {
                const durationSec =
                  (new Date(entry.endedAt).getTime() - new Date(entry.startedAt).getTime()) / 1000
                return (
                  <li key={entry.id} className="flex items-center justify-between gap-2 py-2.5">
                    <span>
                      {formatDateShort(new Date(entry.startedAt))}, {formatTime(new Date(entry.startedAt))}
                    </span>
                    <span className="tabular text-muted-foreground">
                      {entry.count} Bewegungen in {formatDuration(durationSec, { short: true })}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <MedicalDisclaimer>
        Üblicherweise sollten zehn Bewegungen innerhalb von zwei Stunden spürbar sein. Wichtiger
        als jede Zahl ist die Veränderung: Wenn dein Kind deutlich weniger oder anders bewegt als
        sonst, ruf an – auch nachts, auch am Wochenende, auch wenn es sich übertrieben anfühlt.
      </MedicalDisclaimer>
    </div>
  )
}
