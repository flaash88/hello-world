'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Undo2 } from 'lucide-react'
import {
  endPauseAction,
  resetToProtokollAction,
  setFeatureLevelAction,
  startPauseAction,
  toggleFeatureAction,
} from '@/lib/actions/features'
import {
  FEATURE_KEYS,
  FEATURE_LEVELS,
  FEATURES,
  LEVEL_INFO,
  PAUSE_DAUERN,
  type FeatureKey,
  type FeatureLevel,
} from '@/lib/settings/features'
import { formatDateTime } from '@/lib/time'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

export function AnzeigeEinstellungen({
  level: initialLevel,
  schalter: initialSchalter,
  pauseBis,
}: {
  level: FeatureLevel
  schalter: Record<string, boolean>
  pauseBis: string | null
}) {
  const [level, setLevel] = useState(initialLevel)
  const [schalter, setSchalter] = useState(initialSchalter)
  const [pending, startTransition] = useTransition()
  const { toast } = useToast()
  const router = useRouter()

  function waehleStufe(next: FeatureLevel) {
    setLevel(next)
    startTransition(async () => {
      const result = await setFeatureLevelAction({ level: next })
      if ('error' in result) {
        toast({ title: 'Nicht gespeichert', description: result.error, variant: 'destructive' })
      }
      router.refresh()
    })
  }

  function schalte(key: FeatureKey, an: boolean) {
    setSchalter({ ...schalter, [key]: an })
    startTransition(async () => {
      const result = await toggleFeatureAction({ key, an })
      if ('error' in result) {
        toast({ title: 'Nicht gespeichert', description: result.error, variant: 'destructive' })
      }
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Sprössling startet als Protokoll: mitschreiben, nachlesen, ausdrucken. Alles, was rechnet
        oder vergleicht, ist zuerst aus und kommt einzeln dazu, wenn ihr es wollt. Abgeschaltetes
        verschwindet ganz – aus der Leiste unten und aus dem Menü. Eure Einträge bleiben in jedem
        Fall erhalten.
      </p>

      {pauseBis && (
        <Card className="border-primary/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Pause läuft</CardTitle>
            <CardDescription>
              Bis {formatDateTime(new Date(pauseBis))} zeigt die App nur die vier
              Grundkategorien. Die Schalter unten bleiben, wie sie sind, und gelten danach wieder.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await endPauseAction()
                  router.refresh()
                })
              }
            >
              Pause beenden
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Umfang</CardTitle>
          <CardDescription>Eine Voreinstellung für alle Schalter darunter.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {FEATURE_LEVELS.map((value) => (
            <button
              key={value}
              type="button"
              disabled={pending}
              aria-pressed={level === value}
              onClick={() => waehleStufe(value)}
              className={cn(
                'flex min-h-14 flex-col justify-center rounded-xl border px-4 py-2 text-left',
                level === value ? 'border-primary bg-primary/5' : 'border-border bg-card',
              )}
            >
              <span className="font-semibold">{LEVEL_INFO[value].label}</span>
              <span className="text-xs text-muted-foreground">{LEVEL_INFO[value].hint}</span>
            </button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Einzeln</CardTitle>
          <CardDescription>
            Jeder Bereich für sich. Wer nur die Tagesuhr will, schaltet nur die ein.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {FEATURE_KEYS.map((key) => (
            <div key={key} className="flex items-center justify-between gap-4">
              <Label htmlFor={key}>
                <span className="block">{FEATURES[key].label}</span>
                <span className="block text-xs font-normal">{FEATURES[key].hint}</span>
              </Label>
              <Switch
                id={key}
                checked={Boolean(schalter[key])}
                onCheckedChange={(checked) => schalte(key, checked)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Pause</CardTitle>
          <CardDescription>
            Blendet für eine Weile alles außer Stillen, Flasche, Windel und Schlaf aus. Danach
            kommt alles so zurück, wie es war.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2">
          {PAUSE_DAUERN.map((dauer) => (
            <Button
              key={dauer.stunden}
              variant="outline"
              className="h-12"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await startPauseAction({ stunden: dauer.stunden })
                  if ('error' in result) {
                    toast({ title: 'Nicht gestartet', description: result.error, variant: 'destructive' })
                  }
                  router.refresh()
                })
              }
            >
              {dauer.label}
            </Button>
          ))}
        </CardContent>
      </Card>

      <Button
        variant="outline"
        className="h-12"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await resetToProtokollAction()
            if ('error' in result) {
              toast({ title: 'Nicht gespeichert', description: result.error, variant: 'destructive' })
            } else {
              setLevel('protokoll')
              setSchalter(Object.fromEntries(FEATURE_KEYS.map((key) => [key, false])))
              toast({ title: 'Zurück auf Protokollmodus' })
            }
            router.refresh()
          })
        }
      >
        <Undo2 aria-hidden />
        App auf Protokollmodus zurücksetzen
      </Button>
      <p className="pb-4 text-xs text-muted-foreground">
        Setzt alle Schalter oben auf aus. Es werden keine Daten gelöscht.
      </p>
    </div>
  )
}
