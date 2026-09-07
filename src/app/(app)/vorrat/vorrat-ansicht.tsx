'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Milk, Plus, QrCode, Settings2, Snowflake, Trash2 } from 'lucide-react'
import {
  auftauenAction,
  savePortionAction,
  saveMilkSettingsAction,
  verbrauchePortionAction,
  verwerfePortionAction,
} from '@/lib/actions/milk'
import { LAGERORTE, LAGERORT_LABEL, haltbarkeitText } from '@/lib/milk/storage'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EmptyState } from '@/components/ui/empty-state'
import { useToast } from '@/components/ui/toast'
import type { EinstellungenView, GruppeView, PortionView, StatistikView } from './types'

export function VorratAnsicht({
  childId,
  gruppen,
  naechste,
  abgelaufen,
  statistik,
  aufgetautText,
  einstellungen,
}: {
  childId: string | null
  gruppen: GruppeView[]
  naechste: PortionView | null
  abgelaufen: PortionView[]
  statistik: StatistikView
  aufgetautText: string
  einstellungen: EinstellungenView
}) {
  const [anlegen, setAnlegen] = useState(false)
  const [einstellungenOffen, setEinstellungenOffen] = useState(false)
  const [entnahme, setEntnahme] = useState<PortionView | null>(null)

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold">Milchvorrat</h1>
        <p className="text-muted-foreground">
          {statistik.vorratMl} ml in {statistik.vorratPortionen}{' '}
          {statistik.vorratPortionen === 1 ? 'Portion' : 'Portionen'}
        </p>
      </div>

      <Button size="lg" onClick={() => setAnlegen(true)}>
        <Plus aria-hidden />
        Portion einlagern
      </Button>

      {naechste && (
        <Card className="border-primary/40">
          <CardContent className="flex flex-col gap-2 p-4">
            <p className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
              Als nächstes verwenden
            </p>
            <p className="font-semibold">
              {naechste.mengeMl} ml · {naechste.lagerortLabel}
              {naechste.behaelter ? ` · ${naechste.behaelter}` : ''}
            </p>
            <p className="text-sm text-muted-foreground">
              Abgepumpt am {naechste.abgepumptText} · {naechste.ablaufText}
            </p>
            <PortionAktionen portion={naechste} onEntnahme={setEntnahme} />
          </CardContent>
        </Card>
      )}

      {gruppen.length === 0 && (
        <EmptyState
          icon={Milk}
          title="Noch nichts eingelagert"
          description="Was du abpumpst, kannst du hier einlagern – die App rechnet aus, wie lange es haltbar ist, und meldet sich einen Tag vorher."
        />
      )}

      {gruppen.map((gruppe) => (
        <section key={gruppe.lagerort}>
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
              {gruppe.label}
            </h2>
            <p className="text-sm font-semibold">
              {gruppe.summeMl} ml · {gruppe.anzahl}{' '}
              {gruppe.anzahl === 1 ? 'Portion' : 'Portionen'}
            </p>
          </div>
          <p className="mb-2 text-sm text-muted-foreground">
            {gruppe.hinweis} Haltbar {gruppe.haltbarkeitText}.
          </p>
          <ul className="flex flex-col gap-2">
            {gruppe.portionen.map((portion) => (
              <li key={portion.id}>
                <PortionKarte portion={portion} onEntnahme={setEntnahme} />
              </li>
            ))}
          </ul>
        </section>
      ))}

      {abgelaufen.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
            Abgelaufen · {abgelaufen.length}
          </h2>
          <p className="mb-2 text-sm text-muted-foreground">
            Passiert. Ein Tap, und es ist aus der Liste.
          </p>
          <ul className="flex flex-col gap-2">
            {abgelaufen.map((portion) => (
              <li key={portion.id}>
                <PortionKarte portion={portion} onEntnahme={setEntnahme} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex flex-col gap-2">
        <Button asChild variant="outline" size="lg">
          <Link href="/vorrat/etiketten">
            <QrCode aria-hidden />
            Etiketten drucken
          </Link>
        </Button>
        <Button variant="outline" size="lg" onClick={() => setEinstellungenOffen(true)}>
          <Settings2 aria-hidden />
          Haltbarkeiten anpassen
        </Button>
      </div>

      <section>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
          Letzte 30 Tage
        </h2>
        <Card>
          <CardContent className="grid grid-cols-2 gap-3 p-4 text-sm">
            <Kennzahl label="Abgepumpt" wert={`${statistik.abgepumptMl30Tage} ml`} />
            <Kennzahl label="Verbraucht" wert={`${statistik.verbrauchtMl30Tage} ml`} />
            <Kennzahl label="Verworfen" wert={`${statistik.verworfenMl30Tage} ml`} />
            <Kennzahl
              label="Portionsgröße"
              wert={statistik.schnittMl !== null ? `${statistik.schnittMl} ml im Schnitt` : '—'}
            />
            {statistik.abgelaufenMl > 0 && (
              <p className="col-span-2 text-muted-foreground">
                {statistik.abgelaufenMl} ml liegen abgelaufen im Vorrat.
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      <p className="text-sm text-muted-foreground">
        Aufgetaute Milch hält nur noch {aufgetautText} und darf nicht wieder eingefroren werden.
        Die Zeiten sind Richtwerte – im Zweifel riechen und verwerfen.
      </p>

      <PortionDialog childId={childId} open={anlegen} onOpenChange={setAnlegen} />
      <EntnahmeDialog portion={entnahme} onClose={() => setEntnahme(null)} />
      <EinstellungenDialog
        werte={einstellungen}
        open={einstellungenOffen}
        onOpenChange={setEinstellungenOffen}
      />
    </div>
  )
}

function Kennzahl({ label, wert }: { label: string; wert: string }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className="font-semibold">{wert}</p>
    </div>
  )
}

function PortionKarte({
  portion,
  onEntnahme,
}: {
  portion: PortionView
  onEntnahme: (portion: PortionView) => void
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold">
              {portion.mengeMl} ml
              {portion.behaelter ? ` · ${portion.behaelter}` : ''}
            </p>
            <p className="text-sm text-muted-foreground">
              Abgepumpt am {portion.abgepumptText} · {portion.ablaufText}
            </p>
            {portion.notiz && <p className="text-sm">{portion.notiz}</p>}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            {portion.aufgetaut && <Badge variant="outline">Aufgetaut</Badge>}
            {portion.abgelaufen && <Badge variant="outline">Abgelaufen</Badge>}
          </div>
        </div>
        <PortionAktionen portion={portion} onEntnahme={onEntnahme} />
      </CardContent>
    </Card>
  )
}

function PortionAktionen({
  portion,
  onEntnahme,
}: {
  portion: PortionView
  onEntnahme: (portion: PortionView) => void
}) {
  const [pending, startTransition] = useTransition()
  const { toast } = useToast()
  const router = useRouter()

  function lauf(fn: () => Promise<{ ok: true; id?: string } | { error: string }>, titel: string) {
    startTransition(async () => {
      const result = await fn()
      if ('error' in result) {
        toast({ title: 'Nicht geändert', description: result.error, variant: 'destructive' })
      } else {
        toast({ title: titel })
      }
      router.refresh()
    })
  }

  const gefroren = portion.lagerort !== 'kuehlschrank' && !portion.aufgetaut

  return (
    <div className="flex flex-wrap gap-2">
      {!portion.abgelaufen && (
        <Button
          size="lg"
          className="flex-1"
          disabled={pending}
          onClick={() => lauf(() => verbrauchePortionAction(portion.id), 'Verbraucht')}
        >
          Verbraucht
        </Button>
      )}
      {!portion.abgelaufen && (
        <Button size="lg" variant="outline" disabled={pending} onClick={() => onEntnahme(portion)}>
          Teilmenge
        </Button>
      )}
      {!portion.abgelaufen && gefroren && (
        <Button
          size="lg"
          variant="outline"
          disabled={pending}
          onClick={() => lauf(() => auftauenAction(portion.id), 'Aufgetaut – ab jetzt kürzer haltbar')}
          aria-label={`${portion.mengeMl} ml auftauen`}
        >
          <Snowflake aria-hidden />
          Auftauen
        </Button>
      )}
      <Button
        size="lg"
        variant="ghost"
        disabled={pending}
        onClick={() => lauf(() => verwerfePortionAction(portion.id), 'Verworfen')}
        aria-label={`${portion.mengeMl} ml verwerfen`}
      >
        <Trash2 aria-hidden />
        {portion.abgelaufen ? 'Wegwerfen' : ''}
      </Button>
    </div>
  )
}

function PortionDialog({
  childId,
  open,
  onOpenChange,
}: {
  childId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const { toast } = useToast()
  const router = useRouter()

  function submit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await savePortionAction({
        childId,
        abgepumptAm: String(formData.get('abgepumptAm') ?? ''),
        mengeMl: Number(formData.get('mengeMl') ?? 0),
        lagerort: String(formData.get('lagerort') ?? 'kuehlschrank') as 'kuehlschrank',
        behaelter: String(formData.get('behaelter') ?? ''),
        notiz: String(formData.get('notiz') ?? ''),
      })
      if ('error' in result) {
        setError(result.error)
        return
      }
      toast({ title: 'Eingelagert' })
      onOpenChange(false)
      router.refresh()
    })
  }

  const jetzt = new Date()
  const lokal = new Date(jetzt.getTime() - jetzt.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Portion einlagern</DialogTitle>
        </DialogHeader>
        <form action={submit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="abgepumptAm">Abgepumpt am</Label>
            <Input
              id="abgepumptAm"
              name="abgepumptAm"
              type="datetime-local"
              defaultValue={lokal}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mengeMl">Menge (ml)</Label>
            <Input
              id="mengeMl"
              name="mengeMl"
              type="number"
              inputMode="numeric"
              min={1}
              max={1000}
              required
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lagerort">Wohin</Label>
            <Select name="lagerort" defaultValue="kuehlschrank">
              <SelectTrigger id="lagerort">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LAGERORTE.map((ort) => (
                  <SelectItem key={ort} value={ort}>
                    {LAGERORT_LABEL[ort]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="behaelter">Behälter</Label>
            <Input
              id="behaelter"
              name="behaelter"
              maxLength={60}
              placeholder="z. B. Beutel 3, Flasche blau"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notiz">Notiz</Label>
            <Textarea id="notiz" name="notiz" rows={2} maxLength={500} />
          </div>
          {error && (
            <p role="alert" data-testid="form-error" className="text-sm font-medium text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? 'Speichert …' : 'Einlagern'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** Teilmenge entnehmen – der Rest bleibt mit seinem Ablaufdatum stehen. */
function EntnahmeDialog({
  portion,
  onClose,
}: {
  portion: PortionView | null
  onClose: () => void
}) {
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const { toast } = useToast()
  const router = useRouter()

  function submit(formData: FormData) {
    if (!portion) return
    setError(null)
    startTransition(async () => {
      const result = await verbrauchePortionAction(portion.id, Number(formData.get('mengeMl') ?? 0))
      if ('error' in result) {
        setError(result.error)
        return
      }
      toast({ title: 'Entnommen' })
      onClose()
      router.refresh()
    })
  }

  return (
    <Dialog open={Boolean(portion)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Teilmenge entnehmen</DialogTitle>
        </DialogHeader>
        <form action={submit} className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            In der Portion sind {portion?.mengeMl} ml. Was übrig bleibt, bleibt im Vorrat und
            behält sein Ablaufdatum.
          </p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="entnahmeMenge">Entnommen (ml)</Label>
            <Input
              id="entnahmeMenge"
              name="mengeMl"
              type="number"
              inputMode="numeric"
              min={1}
              max={portion?.mengeMl ?? 1000}
              required
              autoFocus
            />
          </div>
          {error && (
            <p role="alert" data-testid="form-error" className="text-sm font-medium text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? 'Speichert …' : 'Entnehmen'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EinstellungenDialog({
  werte,
  open,
  onOpenChange,
}: {
  werte: EinstellungenView
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [push, setPush] = useState(werte.milkExpiryPush)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const { toast } = useToast()
  const router = useRouter()

  function submit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await saveMilkSettingsAction({
        milkFridgeHours: Number(formData.get('milkFridgeHours') ?? 0),
        milkFreezerHours: Number(formData.get('milkFreezerHours') ?? 0),
        milkDeepFreezeHours: Number(formData.get('milkDeepFreezeHours') ?? 0),
        milkThawedHours: Number(formData.get('milkThawedHours') ?? 0),
        milkExpiryPush: push,
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

  const felder = [
    { name: 'milkFridgeHours', label: 'Kühlschrank', wert: werte.milkFridgeHours },
    { name: 'milkFreezerHours', label: 'Gefrierfach', wert: werte.milkFreezerHours },
    { name: 'milkDeepFreezeHours', label: 'Tiefkühler', wert: werte.milkDeepFreezeHours },
    { name: 'milkThawedHours', label: 'Aufgetaut', wert: werte.milkThawedHours },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Haltbarkeiten</DialogTitle>
        </DialogHeader>
        <form action={submit} className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Angaben in Stunden. Die Vorgaben folgen der üblichen Empfehlung für den Haushalt –
            wenn eure Hebamme etwas anderes sagt, gilt das.
          </p>
          {felder.map((feld) => (
            <div key={feld.name} className="flex flex-col gap-1.5">
              <Label htmlFor={feld.name}>
                {feld.label} <span className="font-normal">({haltbarkeitText(feld.wert)})</span>
              </Label>
              <Input
                id={feld.name}
                name={feld.name}
                type="number"
                inputMode="numeric"
                min={1}
                max={9600}
                defaultValue={feld.wert}
                required
              />
            </div>
          ))}
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="milkExpiryPush">Einen Tag vor Ablauf erinnern</Label>
            <Switch id="milkExpiryPush" checked={push} onCheckedChange={setPush} />
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
