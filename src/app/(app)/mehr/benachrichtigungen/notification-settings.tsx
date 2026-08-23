'use client'
import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { BellRing, Send, Smartphone } from 'lucide-react'
import {
  answerQuietHoursAction,
  sendTestNotificationAction,
  updateNotificationPrefsAction,
  updateNtfyAction,
} from '@/lib/actions/notifications'
import {
  RUHEZEIT_VORSCHLAG,
  SCHALTBARE_KATEGORIEN,
  type PrefFeld,
} from '@/lib/push/kategorien'
import { currentSubscription, disablePush, enablePush, pushStatus } from '@/lib/push/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { NumberStepper } from '@/components/tracker/number-stepper'
import { useToast } from '@/components/ui/toast'

type Prefs = Record<PrefFeld, boolean> & {
  napLeadMinutes: number
  quietFrom: string | null
  quietTo: string | null
  ntfyEnabled: boolean
}

export function NotificationSettings({
  vapidPublicKey,
  serverConfigured,
  deviceCount,
  prefs: initialPrefs,
  quietAsked: initialQuietAsked,
  ntfy: initialNtfy,
}: {
  vapidPublicKey: string
  serverConfigured: boolean
  deviceCount: number
  prefs: Prefs
  /** Wurde die Ruhezeit-Frage schon einmal gestellt? */
  quietAsked: boolean
  ntfy: { serverUrl: string; topic: string }
}) {
  const [prefs, setPrefs] = useState(initialPrefs)
  const [quietAsked, setQuietAsked] = useState(initialQuietAsked)
  const [quietFrage, setQuietFrage] = useState(false)
  const [quietEntwurf, setQuietEntwurf] = useState({
    von: initialPrefs.quietFrom ?? RUHEZEIT_VORSCHLAG.von,
    bis: initialPrefs.quietTo ?? RUHEZEIT_VORSCHLAG.bis,
  })
  const [ntfy, setNtfy] = useState(initialNtfy)
  const [subscribed, setSubscribed] = useState<boolean | null>(null)
  const [status, setStatus] = useState<ReturnType<typeof pushStatus>>('default')
  const [pending, startTransition] = useTransition()
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    setStatus(pushStatus())
    void currentSubscription().then((subscription) => setSubscribed(Boolean(subscription)))
  }, [])

  /**
   * Beim ersten Einschalten irgendeiner Benachrichtigung kommt einmal die
   * Frage nach dem Zeitfenster. Danach nie wieder – auch nicht, wenn die
   * Antwort "keine Ruhezeit" war.
   */
  function schalte(feld: PrefFeld, an: boolean) {
    savePrefs({ ...prefs, [feld]: an })
    if (an && !quietAsked) setQuietFrage(true)
  }

  function speichereRuhezeit(von: string | null, bis: string | null) {
    setPrefs({ ...prefs, quietFrom: von, quietTo: bis })
    setQuietAsked(true)
    setQuietFrage(false)
    startTransition(async () => {
      const result = await answerQuietHoursAction({ quietFrom: von, quietTo: bis })
      if ('error' in result) {
        toast({ title: 'Nicht gespeichert', description: result.error, variant: 'destructive' })
      }
      router.refresh()
    })
  }

  function savePrefs(next: Prefs) {
    setPrefs(next)
    startTransition(async () => {
      const result = await updateNotificationPrefsAction(next)
      if ('error' in result) {
        toast({ title: 'Nicht gespeichert', description: result.error, variant: 'destructive' })
      }
      router.refresh()
    })
  }

  async function toggleDevice(enabled: boolean) {
    if (!enabled) {
      await disablePush()
      setSubscribed(false)
      toast({ title: 'Gerät abgemeldet' })
      router.refresh()
      return
    }
    const result = await enablePush(vapidPublicKey)
    if ('error' in result) {
      toast({ title: 'Nicht aktiviert', description: result.error, variant: 'destructive' })
      setStatus(pushStatus())
      return
    }
    setSubscribed(true)
    toast({ title: 'Gerät angemeldet' })
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Smartphone className="size-4 text-muted-foreground" aria-hidden />
            Dieses Gerät
          </CardTitle>
          <CardDescription>
            {deviceCount === 0
              ? 'Noch kein Gerät angemeldet.'
              : `${deviceCount} ${deviceCount === 1 ? 'Gerät' : 'Geräte'} angemeldet.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {!serverConfigured && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              Am Server fehlen die VAPID-Schlüssel. Erzeuge sie mit{' '}
              <code className="font-mono">npx web-push generate-vapid-keys</code> und trage sie in
              die <code className="font-mono">.env</code> ein.
            </p>
          )}
          {status === 'unsupported' ? (
            <p className="text-sm text-muted-foreground">
              Dieser Browser unterstützt keine Push-Benachrichtigungen. Auf dem iPhone
              funktioniert es nur, wenn Sprössling zum Home-Bildschirm hinzugefügt wurde.
            </p>
          ) : status === 'denied' ? (
            <p className="text-sm text-muted-foreground">
              Benachrichtigungen sind für diese Seite blockiert. Das lässt sich nur in den
              Browser-Einstellungen wieder freigeben.
            </p>
          ) : (
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="device">Benachrichtigungen auf diesem Gerät</Label>
              <Switch
                id="device"
                checked={subscribed === true}
                disabled={subscribed === null || !serverConfigured}
                onCheckedChange={(checked) => void toggleDevice(checked)}
              />
            </div>
          )}
          <Button
            variant="outline"
            disabled={pending || !subscribed}
            onClick={() =>
              startTransition(async () => {
                const result = await sendTestNotificationAction()
                if ('error' in result) {
                  toast({ title: 'Nichts angekommen', description: result.error, variant: 'destructive' })
                } else {
                  toast({ title: `An ${result.sent} Gerät(e) geschickt` })
                }
              })
            }
          >
            <Send aria-hidden />
            Probenachricht schicken
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BellRing className="size-4 text-muted-foreground" aria-hidden />
            Wobei soll Sprössling sich melden?
          </CardTitle>
          <CardDescription>Gilt nur für dich, nicht für die andere Person.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {SCHALTBARE_KATEGORIEN.map((kategorie) => {
            const feld = kategorie.feld
            if (!feld) return null
            return (
              <div key={kategorie.key} className="flex items-center justify-between gap-4">
                <Label htmlFor={feld}>
                  <span className="block">{kategorie.label}</span>
                  <span className="block text-xs font-normal">{kategorie.hint}</span>
                </Label>
                <Switch
                  id={feld}
                  checked={prefs[feld]}
                  onCheckedChange={(checked) => schalte(feld, checked)}
                />
              </div>
            )
          })}

          {prefs.sleepWindowAlerts && (
            <NumberStepper
              id="napLead"
              label="Vorwarnzeit vor dem Schlaffenster"
              unit="Minuten"
              step={5}
              min={0}
              max={60}
              value={prefs.napLeadMinutes}
              onChange={(value) => savePrefs({ ...prefs, napLeadMinutes: value ?? 15 })}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ruhezeiten</CardTitle>
          <CardDescription>
            In diesem Zeitraum bleibt das Handy still – für alles, auch für Termine.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="quietFrom">Ab</Label>
            <Input
              id="quietFrom"
              type="time"
              value={prefs.quietFrom ?? ''}
              onChange={(event) => savePrefs({ ...prefs, quietFrom: event.target.value || null })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="quietTo">Bis</Label>
            <Input
              id="quietTo"
              type="time"
              value={prefs.quietTo ?? ''}
              onChange={(event) => savePrefs({ ...prefs, quietTo: event.target.value || null })}
            />
          </div>
        </CardContent>
      </Card>

      <Dialog open={quietFrage} onOpenChange={(open) => !open && speichereRuhezeit(null, null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Wann darf sie kommen?</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              In der Ruhezeit bleibt das Handy still. Die Frage kommt einmal; ändern lässt sich das
              danach hier auf der Seite.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="quietAskFrom">Still ab</Label>
                <Input
                  id="quietAskFrom"
                  type="time"
                  value={quietEntwurf.von}
                  onChange={(event) =>
                    setQuietEntwurf({ ...quietEntwurf, von: event.target.value })
                  }
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="quietAskTo">Wieder ab</Label>
                <Input
                  id="quietAskTo"
                  type="time"
                  value={quietEntwurf.bis}
                  onChange={(event) =>
                    setQuietEntwurf({ ...quietEntwurf, bis: event.target.value })
                  }
                />
              </div>
            </div>
            <Button
              size="lg"
              onClick={() => speichereRuhezeit(quietEntwurf.von || null, quietEntwurf.bis || null)}
            >
              Ruhezeit übernehmen
            </Button>
            <Button variant="ghost" onClick={() => speichereRuhezeit(null, null)}>
              Keine Ruhezeit
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">ntfy (optional)</CardTitle>
          <CardDescription>
            Zusätzlicher Weg über einen eigenen ntfy-Server – nützlich, wenn Web Push auf einem
            Gerät nicht ankommt.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ntfyUrl">Server-URL</Label>
            <Input
              id="ntfyUrl"
              inputMode="url"
              placeholder="https://ntfy.example.org"
              value={ntfy.serverUrl}
              onChange={(event) => setNtfy({ ...ntfy, serverUrl: event.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ntfyTopic">Topic</Label>
            <Input
              id="ntfyTopic"
              placeholder="sproessling-familie"
              value={ntfy.topic}
              onChange={(event) => setNtfy({ ...ntfy, topic: event.target.value })}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="ntfyEnabled">ntfy für meine Benachrichtigungen nutzen</Label>
            <Switch
              id="ntfyEnabled"
              checked={prefs.ntfyEnabled}
              onCheckedChange={(checked) => savePrefs({ ...prefs, ntfyEnabled: checked })}
            />
          </div>
          <Button
            variant="outline"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await updateNtfyAction({
                  ntfyServerUrl: ntfy.serverUrl || null,
                  ntfyTopic: ntfy.topic || null,
                })
                if ('error' in result) {
                  toast({ title: 'Nicht gespeichert', description: result.error, variant: 'destructive' })
                } else {
                  toast({ title: 'Gespeichert' })
                  router.refresh()
                }
              })
            }
          >
            ntfy-Einstellungen speichern
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
