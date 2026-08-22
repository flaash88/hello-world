'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/toast'
import { useTheme, type ThemeMode } from '@/components/theme-provider'
import { updateNightModeAction } from '@/lib/actions/settings'
import { cn } from '@/lib/utils'

const MODES: { value: ThemeMode; label: string; hint: string }[] = [
  { value: 'auto', label: 'Automatisch', hint: 'Folgt dem eingestellten Zeitfenster' },
  { value: 'day', label: 'Immer hell', hint: 'Tagesansicht, auch nachts' },
  { value: 'night', label: 'Immer dunkel', hint: 'Reduzierte Nachtansicht' },
]

export function NightModeSettings({
  auto,
  start,
  end,
}: {
  auto: boolean
  start: string
  end: string
}) {
  const { mode, setMode, resolved } = useTheme()
  const [autoOn, setAutoOn] = useState(auto)
  const [from, setFrom] = useState(start)
  const [to, setTo] = useState(end)
  const [pending, startTransition] = useTransition()
  const { toast } = useToast()
  const router = useRouter()

  function save() {
    startTransition(async () => {
      const result = await updateNightModeAction({ nightModeAuto: autoOn, nightModeStart: from, nightModeEnd: to })
      if ('error' in result) {
        toast({ title: 'Nicht gespeichert', description: result.error, variant: 'destructive' })
      } else {
        toast({ title: 'Gespeichert' })
        router.refresh()
      }
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Auf diesem Gerät</CardTitle>
          <CardDescription>
            Gilt nur hier und wird lokal gespeichert. Gerade aktiv:{' '}
            {resolved === 'night' ? 'Nachtansicht' : 'Tagansicht'}.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {MODES.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setMode(option.value)}
              className={cn(
                'flex min-h-14 items-center justify-between rounded-xl border-2 px-4 text-left',
                mode === option.value ? 'border-primary bg-primary/5' : 'border-border',
              )}
            >
              <span>
                <span className="block font-semibold">{option.label}</span>
                <span className="block text-xs text-muted-foreground">{option.hint}</span>
              </span>
            </button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Zeitfenster für den Haushalt</CardTitle>
          <CardDescription>Gilt für beide Geräte, wenn dort „Automatisch“ eingestellt ist.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="auto">Nachtmodus automatisch einschalten</Label>
            <Switch id="auto" checked={autoOn} onCheckedChange={setAutoOn} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="from">Ab</Label>
              <Input id="from" type="time" value={from} onChange={(e) => setFrom(e.target.value)} disabled={!autoOn} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="to">Bis</Label>
              <Input id="to" type="time" value={to} onChange={(e) => setTo(e.target.value)} disabled={!autoOn} />
            </div>
          </div>
          <Button onClick={save} disabled={pending}>
            {pending ? 'Speichert …' : 'Speichern'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
