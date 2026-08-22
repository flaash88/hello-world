'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Baby, HeartHandshake, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createChildAction } from '@/lib/actions/children'
import { createPregnancyAction } from '@/lib/actions/pregnancy'

type Step = 'disclaimer' | 'mode' | 'pregnancy' | 'child'

export function OnboardingFlow({
  householdName,
  hasChild,
  hasPregnancy,
}: {
  householdName: string
  hasChild: boolean
  hasPregnancy: boolean
}) {
  const [step, setStep] = useState<Step>('disclaimer')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function submitPregnancy(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await createPregnancyAction({
        label: String(formData.get('label') ?? ''),
        dueDate: String(formData.get('dueDate') ?? ''),
        lastPeriod: String(formData.get('lastPeriod') ?? ''),
      })
      if ('error' in result) setError(result.error)
      else router.push('/')
    })
  }

  function submitChild(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await createChildAction({
        name: String(formData.get('name') ?? ''),
        birthDate: String(formData.get('birthDate') ?? ''),
        dueDate: String(formData.get('childDueDate') ?? ''),
        sex: (formData.get('sex') as 'male' | 'female' | 'unknown') ?? 'unknown',
      })
      if ('error' in result) setError(result.error)
      else router.push('/')
    })
  }

  if (step === 'disclaimer') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-primary" aria-hidden />
            Kurz vorweg
          </CardTitle>
          <CardDescription>Willkommen bei {householdName}.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-sm leading-relaxed">
          <p>
            Sprössling ist ein Logbuch, kein medizinisches Gerät. Alle Auswertungen –
            Wachfenster, Perzentile, Wehenabstände, Wachstumskurven – sind eine Orientierung
            für euch, keine Diagnose und keine Empfehlung.
          </p>
          <p>
            Bei Sorgen um dich oder euer Kind wendet euch an eure Hebamme, Kinderärztin oder
            Ärztin. Im Notfall ruft <strong>144</strong> (Rettung) oder <strong>112</strong>.
          </p>
          <p className="text-muted-foreground">
            Alle Daten bleiben auf eurem eigenen Server. Es gibt keine Tracker, keine
            Auswertung durch Dritte, keine Cloud.
          </p>
          <Button size="lg" onClick={() => setStep('mode')}>
            Verstanden, weiter
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (step === 'mode') {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="font-display text-2xl font-bold">Was passt gerade?</h1>
        {!hasPregnancy && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HeartHandshake className="size-5 text-primary" aria-hidden />
                Wir sind schwanger
              </CardTitle>
              <CardDescription>
                SSW-Ansicht, Countdown, Wehen-Timer, Kliniktasche und Namensliste.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={() => setStep('pregnancy')}>
                Schwangerschaft anlegen
              </Button>
            </CardContent>
          </Card>
        )}
        {!hasChild && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Baby className="size-5 text-primary" aria-hidden />
                Unser Kind ist da
              </CardTitle>
              <CardDescription>Tracker, Schlafvorhersage, Wachstum und Tagebuch.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={() => setStep('child')}>
                Kind anlegen
              </Button>
            </CardContent>
          </Card>
        )}
        <Button variant="ghost" onClick={() => router.push('/')}>
          Später
        </Button>
      </div>
    )
  }

  if (step === 'pregnancy') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Schwangerschaft anlegen</CardTitle>
          <CardDescription>Der errechnete Termin genügt – der Rest ist optional.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={submitPregnancy} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dueDate">Errechneter Termin</Label>
              <Input id="dueDate" name="dueDate" type="date" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lastPeriod">Erster Tag der letzten Periode (optional)</Label>
              <Input id="lastPeriod" name="lastPeriod" type="date" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="label">Wie nennt ihr das Baby vorerst?</Label>
              <Input id="label" name="label" defaultValue="Unser Baby" maxLength={40} />
            </div>
            {error && <p className="text-sm font-medium text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setStep('mode')}>
                Zurück
              </Button>
              <Button type="submit" className="flex-1" disabled={pending}>
                {pending ? 'Speichert …' : 'Anlegen'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Kind anlegen</CardTitle>
        <CardDescription>
          Der errechnete Termin ist nur nötig, wenn euer Kind zu früh gekommen ist – daraus
          ergibt sich das korrigierte Alter.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={submitChild} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required maxLength={60} autoFocus />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="birthDate">Geburtsdatum</Label>
            <Input id="birthDate" name="birthDate" type="date" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="childDueDate">Errechneter Termin (bei Frühgeburt)</Label>
            <Input id="childDueDate" name="childDueDate" type="date" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sex">Geschlecht (für die WHO-Wachstumskurven)</Label>
            <Select name="sex" defaultValue="unknown">
              <SelectTrigger id="sex">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="female">Mädchen</SelectItem>
                <SelectItem value="male">Bub</SelectItem>
                <SelectItem value="unknown">Keine Angabe</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {error && <p className="text-sm font-medium text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setStep('mode')}>
              Zurück
            </Button>
            <Button type="submit" className="flex-1" disabled={pending}>
              {pending ? 'Speichert …' : 'Anlegen'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
