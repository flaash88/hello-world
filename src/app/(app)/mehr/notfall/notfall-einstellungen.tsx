'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2 } from 'lucide-react'
import {
  KONTAKT_ROLLEN,
  KONTAKT_ROLLE_LABEL,
  type Kontakt,
  type KontaktRolle,
} from '@/lib/emergency/card'
import {
  deleteEmergencyContactAction,
  saveEmergencyContactAction,
  saveEmergencyInfoAction,
} from '@/lib/actions/emergency'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'

export function NotfallEinstellungen({
  childId,
  childName,
  blutgruppe: blutgruppeInitial,
  vorerkrankungen: vorerkrankungenInitial,
  adresse: adresseInitial,
  kontakte,
}: {
  childId: string
  childName: string
  blutgruppe: string
  vorerkrankungen: string
  adresse: string
  kontakte: Kontakt[]
}) {
  const [blutgruppe, setBlutgruppe] = useState(blutgruppeInitial)
  const [vorerkrankungen, setVorerkrankungen] = useState(vorerkrankungenInitial)
  const [adresse, setAdresse] = useState(adresseInitial)
  const [bearbeiten, setBearbeiten] = useState<Kontakt | 'neu' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const { toast } = useToast()
  const router = useRouter()

  function speichern() {
    setError(null)
    startTransition(async () => {
      const result = await saveEmergencyInfoAction({
        childId,
        blutgruppe,
        vorerkrankungen,
        adresse,
      })
      if ('error' in result) {
        setError(result.error)
        return
      }
      toast({ title: 'Gespeichert' })
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Hier steht nur, was es sonst nirgends gibt. Allergien und Dauermedikamente trägst du unter
        Gesundheit ein, das Gewicht bei den Messungen, die Impfungen unter Vorsorge – die
        Notfallkarte liest von dort. Zweimal gepflegte Notfalldaten sind schlimmer als keine.
      </p>

      <Card>
        <CardContent className="flex flex-col gap-4 p-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="blutgruppe">Blutgruppe von {childName}</Label>
            <Input
              id="blutgruppe"
              value={blutgruppe}
              maxLength={20}
              placeholder="z. B. 0 Rh+"
              onChange={(event) => setBlutgruppe(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="vorerkrankungen">Vorerkrankungen</Label>
            <Textarea
              id="vorerkrankungen"
              rows={3}
              maxLength={500}
              value={vorerkrankungen}
              placeholder="z. B. Herzfehler, Krampfanfall im Mai"
              onChange={(event) => setVorerkrankungen(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="adresse">Adresse</Label>
            <Textarea
              id="adresse"
              rows={2}
              maxLength={200}
              value={adresse}
              placeholder="Straße, Hausnummer, Stiege, Tür, PLZ, Ort"
              onChange={(event) => setAdresse(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Im Notruf wird zuerst danach gefragt. Stiege und Tür gehören dazu.
            </p>
          </div>

          {error && (
            <p role="alert" data-testid="form-error" className="text-sm font-medium text-destructive">
              {error}
            </p>
          )}

          <Button size="lg" onClick={speichern} disabled={pending}>
            {pending ? 'Speichert …' : 'Speichern'}
          </Button>
        </CardContent>
      </Card>

      <section>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
          Kontakte
        </h2>
        <ul className="flex flex-col gap-2">
          {kontakte.map((kontakt) => (
            <li key={kontakt.id}>
              <Card>
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{kontakt.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {KONTAKT_ROLLE_LABEL[kontakt.rolle]} · {kontakt.nummer}
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => setBearbeiten(kontakt)}>
                    Ändern
                  </Button>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
        <Button variant="outline" size="lg" className="mt-2 w-full" onClick={() => setBearbeiten('neu')}>
          <Plus aria-hidden />
          Kontakt hinzufügen
        </Button>
        <p className="mt-2 text-xs text-muted-foreground">
          Rettung, Vergiftungsinformationszentrale und die Gesundheitsnummer stehen fix auf der
          Karte und lassen sich nicht löschen.
        </p>
      </section>

      <KontaktDialog kontakt={bearbeiten} onClose={() => setBearbeiten(null)} />
    </div>
  )
}

function KontaktDialog({
  kontakt,
  onClose,
}: {
  kontakt: Kontakt | 'neu' | null
  onClose: () => void
}) {
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const { toast } = useToast()
  const router = useRouter()

  const vorhanden = kontakt !== null && kontakt !== 'neu' ? kontakt : null

  function submit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await saveEmergencyContactAction({
        id: vorhanden?.id,
        rolle: String(formData.get('rolle') ?? 'frei') as KontaktRolle,
        name: String(formData.get('name') ?? ''),
        nummer: String(formData.get('nummer') ?? ''),
      })
      if ('error' in result) {
        setError(result.error)
        return
      }
      toast({ title: 'Gespeichert' })
      onClose()
      router.refresh()
    })
  }

  function loeschen() {
    if (!vorhanden) return
    startTransition(async () => {
      const result = await deleteEmergencyContactAction(vorhanden.id)
      if ('error' in result) {
        setError(result.error)
        return
      }
      toast({ title: 'Kontakt entfernt' })
      onClose()
      router.refresh()
    })
  }

  return (
    <Dialog open={kontakt !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{vorhanden ? 'Kontakt ändern' : 'Kontakt hinzufügen'}</DialogTitle>
        </DialogHeader>
        {/* Der Schlüssel setzt die Felder zurück, wenn ein anderer Kontakt kommt. */}
        <form
          key={vorhanden?.id ?? 'neu'}
          action={submit}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="kontaktRolle">Rolle</Label>
            <Select name="rolle" defaultValue={vorhanden?.rolle ?? 'kinderarzt'}>
              <SelectTrigger id="kontaktRolle">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {KONTAKT_ROLLEN.map((rolle) => (
                  <SelectItem key={rolle} value={rolle}>
                    {KONTAKT_ROLLE_LABEL[rolle]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="kontaktName">Name</Label>
            <Input
              id="kontaktName"
              name="name"
              maxLength={80}
              required
              defaultValue={vorhanden?.name ?? ''}
              placeholder="Dr. Berger"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="kontaktNummer">Telefonnummer</Label>
            <Input
              id="kontaktNummer"
              name="nummer"
              type="tel"
              maxLength={40}
              required
              defaultValue={vorhanden?.nummer ?? ''}
              placeholder="0662 123456"
            />
          </div>
          {error && (
            <p role="alert" data-testid="form-error" className="text-sm font-medium text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? 'Speichert …' : 'Speichern'}
          </Button>
          {vorhanden && (
            <Button type="button" variant="ghost" onClick={loeschen} disabled={pending}>
              <Trash2 aria-hidden />
              Kontakt entfernen
            </Button>
          )}
        </form>
      </DialogContent>
    </Dialog>
  )
}
