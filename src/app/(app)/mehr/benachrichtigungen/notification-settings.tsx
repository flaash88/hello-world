'use client'
import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { BellRing, Send, Smartphone } from 'lucide-react'
import {
  sendTestNotificationAction,
  updateNotificationPrefsAction,
  updateNtfyAction,
} from '@/lib/actions/notifications'
import { currentSubscription, disablePush, enablePush, pushStatus } from '@/lib/push/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { NumberStepper } from '@/components/tracker/number-stepper'
import { useToast } from '@/components/ui/toast'

type Prefs = {
  napAlerts: boolean
  napLeadMinutes: number
  feedAlerts: boolean
  medicationAlerts: boolean
  appointmentAlerts: boolean
  partnerActivity: boolean
  quietFrom: string | null
  quietTo: string | null
  ntfyEnabled: boolean
}

const TOGGLES: { key: keyof Prefs; label: string; hint: string }[] = [
  { key: 'napAlerts', label: 'Schlaffenster', hint: 'Kurz bevor das nächste Fenster beginnt' },
  { key: 'medicationAlerts', label: 'Medikamente', hint: 'Wenn die nächste Gabe fällig ist' },
  { key: 'appointmentAlerts', label: 'Termine', hint: 'Erinnerung an anstehende Termine' },
  { key: 'feedAlerts', label: 'Fütterung', hint: 'Wenn länger nichts eingetragen wurde' },
  { key: 'partnerActivity', label: 'Einträge der anderen Person', hint: 'Kann schnell zu viel werden' },
]

export function NotificationSettings({
  vapidPublicKey,
  serverConfigured,
  deviceCount,
  prefs: initialPrefs,
  ntfy: initialNtfy,
}: {
  vapidPublicKey: string
  serverConfigured: boolean
  deviceCount: number
  prefs: Prefs
  ntfy: { serverUrl: string; topic: string }
}) {
  const [prefs, setPrefs] = useState(initialPrefs)
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
          {TOGGLES.map((toggle) => (
            <div key={toggle.key} className="flex items-center justify-between gap-4">
              <Label htmlFor={toggle.key}>
                <span className="block">{toggle.label}</span>
                <span className="block text-xs font-normal">{toggle.hint}</span>
              </Label>
              <Switch
                id={toggle.key}
                checked={Boolean(prefs[toggle.key])}
                onCheckedChange={(checked) => savePrefs({ ...prefs, [toggle.key]: checked })}
              />
            </div>
          ))}

          {prefs.napAlerts && (
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
          <CardDescription>In diesem Zeitraum bleibt das Handy still.</CardDescription>
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
