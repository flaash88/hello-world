'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Baby, Check, Plus } from 'lucide-react'
import { createChildAction, setActiveChildAction, updateChildAction } from '@/lib/actions/children'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { EmptyState } from '@/components/ui/empty-state'

export type ChildProfile = {
  id: string
  name: string
  birthDate: string
  dueDate: string
  sex: 'male' | 'female' | 'unknown'
  birthWeightG: string
  dischargeWeightG: string
  ageLabel: string | null
  correctedWeeks: number | null
  isActive: boolean
}

/** Leeres Feld heisst "nicht eingetragen" – nicht null Gramm. */
function gramm(value: string): number | null {
  const zahl = Number(value)
  return value.trim() === '' || !Number.isFinite(zahl) ? null : Math.round(zahl)
}

export function ChildSettings({ profiles }: { profiles: ChildProfile[] }) {
  const [adding, setAdding] = useState(false)

  return (
    <div className="flex flex-col gap-4">
      {profiles.length === 0 ? (
        <EmptyState
          icon={Baby}
          title="Noch kein Kind angelegt"
          description="Sobald euer Kind da ist, legt ihr es hier an – die Schwangerschaft läuft davon unabhängig weiter."
        />
      ) : (
        profiles.map((profile) => <ChildCard key={profile.id} profile={profile} multiple={profiles.length > 1} />)
      )}

      <Button variant="outline" onClick={() => setAdding(true)}>
        <Plus aria-hidden />
        Weiteres Kind anlegen
      </Button>

      <NewChildDialog open={adding} onOpenChange={setAdding} />
    </div>
  )
}

function ChildCard({ profile, multiple }: { profile: ChildProfile; multiple: boolean }) {
  const [name, setName] = useState(profile.name)
  const [birthDate, setBirthDate] = useState(profile.birthDate)
  const [dueDate, setDueDate] = useState(profile.dueDate)
  const [sex, setSex] = useState(profile.sex)
  const [birthWeightG, setBirthWeightG] = useState(profile.birthWeightG)
  const [dischargeWeightG, setDischargeWeightG] = useState(profile.dischargeWeightG)
  const [pending, startTransition] = useTransition()
  const { toast } = useToast()
  const router = useRouter()

  function save() {
    startTransition(async () => {
      const result = await updateChildAction(profile.id, {
        name,
        birthDate,
        dueDate,
        sex,
        birthWeightG: gramm(birthWeightG),
        dischargeWeightG: gramm(dischargeWeightG),
      })
      if ('error' in result) {
        toast({ title: 'Nicht gespeichert', description: result.error, variant: 'destructive' })
        return
      }
      toast({ title: 'Gespeichert' })
      router.refresh()
    })
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Baby className="size-4 text-muted-foreground" aria-hidden />
          {profile.name}
        </CardTitle>
        <CardDescription>
          {profile.ageLabel ?? 'Kein Geburtsdatum hinterlegt'}
          {profile.correctedWeeks !== null && ` · korrigiert ${profile.correctedWeeks} Wochen`}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`name-${profile.id}`}>Name</Label>
          <Input
            id={`name-${profile.id}`}
            value={name}
            maxLength={60}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`birth-${profile.id}`}>Geburtsdatum</Label>
          <Input
            id={`birth-${profile.id}`}
            type="date"
            value={birthDate}
            onChange={(event) => setBirthDate(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`due-${profile.id}`}>Errechneter Termin (bei Frühgeburt)</Label>
          <Input
            id={`due-${profile.id}`}
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Ist der Termin hinterlegt, rechnen Schlaffenster, Wocheninhalte und Perzentile bis
            zwei Jahre mit dem korrigierten Alter.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`bw-${profile.id}`}>Geburtsgewicht (g)</Label>
            <Input
              id={`bw-${profile.id}`}
              type="number"
              inputMode="numeric"
              min={200}
              max={8000}
              value={birthWeightG}
              placeholder="3400"
              onChange={(event) => setBirthWeightG(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`dw-${profile.id}`}>Bei Entlassung (g)</Label>
            <Input
              id={`dw-${profile.id}`}
              type="number"
              inputMode="numeric"
              min={200}
              max={8000}
              value={dischargeWeightG}
              placeholder="3210"
              onChange={(event) => setDischargeWeightG(event.target.value)}
            />
          </div>
          <p className="col-span-2 text-xs text-muted-foreground">
            Mit dem Geburtsgewicht zeigt „Wachstum“ in den ersten sechs Wochen den Verlauf der
            ersten Tage statt der Perzentilkurven.
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`sex-${profile.id}`}>Geschlecht (für die WHO-Kurven)</Label>
          <Select value={sex} onValueChange={(value) => setSex(value as ChildProfile['sex'])}>
            <SelectTrigger id={`sex-${profile.id}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="female">Mädchen</SelectItem>
              <SelectItem value="male">Bub</SelectItem>
              <SelectItem value="unknown">Keine Angabe</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={save} disabled={pending}>
          {pending ? 'Speichert …' : 'Speichern'}
        </Button>

        {multiple &&
          (profile.isActive ? (
            <p className="flex items-center justify-center gap-1.5 text-sm font-semibold text-primary">
              <Check className="size-4" aria-hidden />
              Aktuell ausgewählt
            </p>
          ) : (
            <form action={setActiveChildAction.bind(null, profile.id)}>
              <Button type="submit" variant="outline" className="w-full">
                Dieses Kind anzeigen
              </Button>
            </form>
          ))}
      </CardContent>
    </Card>
  )
}

function NewChildDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function submit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await createChildAction({
        name: String(formData.get('name') ?? ''),
        birthDate: String(formData.get('birthDate') ?? ''),
        dueDate: String(formData.get('dueDate') ?? ''),
        sex: (String(formData.get('sex') ?? 'unknown') || 'unknown') as ChildProfile['sex'],
        birthWeightG: gramm(String(formData.get('birthWeightG') ?? '')),
      })
      if ('error' in result) {
        setError(result.error)
        return
      }
      onOpenChange(false)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Weiteres Kind anlegen</DialogTitle>
        </DialogHeader>
        <form action={submit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="newName">Name</Label>
            <Input id="newName" name="name" required maxLength={60} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="newBirth">Geburtsdatum</Label>
            <Input id="newBirth" name="birthDate" type="date" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="newDue">Errechneter Termin (bei Frühgeburt)</Label>
            <Input id="newDue" name="dueDate" type="date" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="newBirthWeight">Geburtsgewicht (g)</Label>
            <Input
              id="newBirthWeight"
              name="birthWeightG"
              type="number"
              inputMode="numeric"
              min={200}
              max={8000}
              placeholder="3400"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="newSex">Geschlecht</Label>
            <Select name="sex" defaultValue="unknown">
              <SelectTrigger id="newSex">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="female">Mädchen</SelectItem>
                <SelectItem value="male">Bub</SelectItem>
                <SelectItem value="unknown">Keine Angabe</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {error && (
            <p data-testid="form-error" className="text-sm font-medium text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" disabled={pending}>
            {pending ? 'Legt an …' : 'Anlegen'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
