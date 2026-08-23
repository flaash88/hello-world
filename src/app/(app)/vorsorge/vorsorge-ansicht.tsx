'use client'
import { useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { AlertTriangle, Check, CircleDot, Eye, Syringe, Stethoscope, Undo2 } from 'lucide-react'
import { markVorsorgeDoneAction, undoVorsorgeAction } from '@/lib/actions/vorsorge'
import type { VorsorgeStatus } from '@/lib/vorsorge/status'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/toast'
import { PhotoUpload, type UploadedPhoto } from '@/components/journal/photo-upload'
import { MedicalDisclaimer } from '@/components/medical-disclaimer'
import { cn } from '@/lib/utils'
import type { KbgView, QuellenAngabe, VerlaufView, VorsorgeView } from './types'

const STATUS_LABEL: Record<VorsorgeStatus, string> = {
  faellig: 'Jetzt dran',
  ueberfaellig: 'Fenster vorbei',
  offen: 'Später',
  ohneFenster: 'Zeitraum offen',
  erledigt: 'Erledigt',
}

const STATUS_BADGE: Record<VorsorgeStatus, 'default' | 'secondary' | 'outline'> = {
  faellig: 'default',
  ueberfaellig: 'outline',
  offen: 'outline',
  ohneFenster: 'outline',
  erledigt: 'secondary',
}

const STATUS_DOT: Record<VorsorgeStatus, string> = {
  faellig: 'bg-primary',
  ueberfaellig: 'bg-muted-foreground',
  offen: 'bg-border',
  ohneFenster: 'bg-border',
  erledigt: 'bg-primary/40',
}

export function VorsorgeAnsicht({
  childId,
  childName,
  geburtstag,
  impfungen,
  untersuchungen,
  mutterHinweis,
  mutterAnzahl,
  kbg,
  kbgHinweis,
  kbgKuerzung,
  verlauf,
  ohneFenster,
  bisWann,
  quellen,
}: {
  childId: string
  childName: string
  geburtstag: string
  impfungen: VorsorgeView[]
  untersuchungen: VorsorgeView[]
  mutterHinweis: string
  mutterAnzahl: number
  kbg: KbgView[]
  kbgHinweis: string
  kbgKuerzung: string
  verlauf: VerlaufView[]
  ohneFenster: string[]
  bisWann: string | null
  quellen: QuellenAngabe[]
}) {
  const [erledigen, setErledigen] = useState<VorsorgeView | null>(null)

  const alle = useMemo(
    () => new Map([...impfungen, ...untersuchungen].map((e) => [`${e.kind}:${e.key}`, e])),
    [impfungen, untersuchungen],
  )

  const offeneImpfungen = impfungen.filter((e) => e.status === 'faellig').length
  const offeneUntersuchungen = untersuchungen.filter((e) => e.status === 'faellig').length

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold">Vorsorge</h1>
        <p className="text-muted-foreground">
          {childName}, geboren am {geburtstag}. Alle Termine rechnen ab diesem Tag.
        </p>
      </div>

      <Tabs defaultValue="impfungen">
        <TabsList className="w-full">
          <TabsTrigger value="impfungen">
            Impfungen{offeneImpfungen > 0 ? ` · ${offeneImpfungen}` : ''}
          </TabsTrigger>
          <TabsTrigger value="untersuchungen">
            Untersuchungen{offeneUntersuchungen > 0 ? ` · ${offeneUntersuchungen}` : ''}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="impfungen">
          <Liste eintraege={impfungen} onErledigen={setErledigen} childId={childId} />
        </TabsContent>

        <TabsContent value="untersuchungen">
          <div className="flex flex-col gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="font-semibold">{mutterAnzahl} Untersuchungen in der Schwangerschaft</p>
                <p className="mt-1 text-sm text-muted-foreground">{mutterHinweis}</p>
              </CardContent>
            </Card>

            <Liste eintraege={untersuchungen} onErledigen={setErledigen} childId={childId} />

            <section>
              <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
                Kinderbetreuungsgeld
              </h2>
              <Card>
                <CardContent className="flex flex-col gap-3 p-4">
                  <p className="text-sm">{kbgHinweis}</p>
                  <p className="text-sm font-semibold">
                    Je fehlendem Nachweis {kbgKuerzung} weniger – pro Elternteil.
                  </p>
                  <ul className="flex flex-col gap-2">
                    {kbg.map((frist) => (
                      <li key={frist.key} className="flex items-start gap-2 text-sm">
                        <span
                          className={cn('mt-1.5 size-2 shrink-0 rounded-full', STATUS_DOT[frist.status])}
                          aria-hidden
                        />
                        <span>
                          <span className="font-semibold">{frist.bezeichnung}</span>
                          <span className="block text-muted-foreground">
                            {frist.wann}
                            {frist.faelligAm ? ` · bis ${frist.faelligAm}` : ''}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </section>
          </div>
        </TabsContent>
      </Tabs>

      <section>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
          Die ersten fünf Jahre
        </h2>
        <ol className="flex flex-col gap-4">
          {verlauf.map((abschnitt) => (
            <li key={abschnitt.label}>
              <p className="mb-1 font-semibold">{abschnitt.label}</p>
              <ul className="border-l-2 border-border pl-3">
                {abschnitt.keys.map((key) => {
                  const eintrag = alle.get(key)
                  if (!eintrag) return null
                  return (
                    <li key={key} className="flex items-center gap-2 py-1 text-sm">
                      <span
                        className={cn('size-2 shrink-0 rounded-full', STATUS_DOT[eintrag.status])}
                        aria-hidden
                      />
                      <span className={cn(eintrag.status === 'erledigt' && 'text-muted-foreground')}>
                        {eintrag.titel}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </li>
          ))}
          {ohneFenster.length > 0 && (
            <li>
              <p className="mb-1 font-semibold">Ohne hinterlegten Zeitraum</p>
              <ul className="border-l-2 border-dashed border-border pl-3">
                {ohneFenster.map((key) => (
                  <li key={key} className="py-1 text-sm text-muted-foreground">
                    {alle.get(key)?.titel}
                  </li>
                ))}
              </ul>
            </li>
          )}
        </ol>
        {bisWann && (
          <p className="mt-2 text-sm text-muted-foreground">
            Der letzte hinterlegte Termin liegt am {bisWann}.
          </p>
        )}
      </section>

      <MedicalDisclaimer>
        Diese Übersicht hilft beim Nichtvergessen. Was tatsächlich ansteht, entscheiden eure
        Kinderärztin und der Eintrag im Eltern-Kind-Pass – nicht diese Liste.
      </MedicalDisclaimer>

      <Quellen quellen={quellen} />

      <ErledigtDialog
        childId={childId}
        eintrag={erledigen}
        onClose={() => setErledigen(null)}
      />
    </div>
  )
}

function Liste({
  eintraege,
  onErledigen,
  childId,
}: {
  eintraege: VorsorgeView[]
  onErledigen: (eintrag: VorsorgeView) => void
  childId: string
}) {
  const offen = eintraege.filter((e) => e.status !== 'erledigt')
  const erledigt = eintraege.filter((e) => e.status === 'erledigt')

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-2">
        {offen.map((eintrag) => (
          <li key={eintrag.key}>
            <EintragKarte eintrag={eintrag} onErledigen={onErledigen} childId={childId} />
          </li>
        ))}
      </ul>

      {erledigt.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
            Erledigt · {erledigt.length}
          </h2>
          <ul className="flex flex-col gap-2">
            {erledigt.map((eintrag) => (
              <li key={eintrag.key}>
                <EintragKarte eintrag={eintrag} onErledigen={onErledigen} childId={childId} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function EintragKarte({
  eintrag,
  onErledigen,
  childId,
}: {
  eintrag: VorsorgeView
  onErledigen: (eintrag: VorsorgeView) => void
  childId: string
}) {
  const [pending, startTransition] = useTransition()
  const { toast } = useToast()
  const router = useRouter()
  const Icon = eintrag.kind === 'impfung' ? Syringe : eintrag.separaterTermin ? Eye : Stethoscope

  function zurueck() {
    startTransition(async () => {
      const result = await undoVorsorgeAction(childId, eintrag.kind, eintrag.key)
      if ('error' in result) {
        toast({ title: 'Nicht geändert', description: result.error, variant: 'destructive' })
      } else {
        toast({ title: 'Häkchen zurückgenommen' })
      }
      router.refresh()
    })
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-start gap-3">
          <Icon className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{eintrag.titel}</p>
            <p className="text-sm text-muted-foreground">{eintrag.untertitel}</p>

            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <Badge variant={STATUS_BADGE[eintrag.status]}>{STATUS_LABEL[eintrag.status]}</Badge>
              {eintrag.separaterTermin && <Badge variant="outline">Eigener Termin</Badge>}
              {eintrag.kbgRelevant && <Badge variant="outline">Zählt fürs KBG</Badge>}
              {eintrag.kostenfrei === true && <Badge variant="outline">Kostenfrei</Badge>}
              {eintrag.kostenfrei === false && <Badge variant="outline">Selbst zu zahlen</Badge>}
            </div>

            <p className="mt-1.5 text-sm">
              {eintrag.status === 'erledigt' && eintrag.doneAt
                ? `Erledigt am ${new Date(eintrag.doneAt).toLocaleDateString('de-AT')}`
                : eintrag.statusText}
            </p>
            {eintrag.quellText && (
              <p className="text-sm text-muted-foreground">Vorgesehen: {eintrag.quellText}</p>
            )}
            <p className="mt-1.5 text-sm text-muted-foreground">{eintrag.hinweis}</p>

            {eintrag.ort && <p className="mt-1.5 text-sm">Bei: {eintrag.ort}</p>}
            {eintrag.note && <p className="text-sm">{eintrag.note}</p>}
            {eintrag.photo && (
              <Image
                src={`/api/uploads/${eintrag.photo.thumbPath}`}
                alt=""
                width={160}
                height={160}
                unoptimized
                className="mt-2 aspect-square w-24 rounded-lg object-cover"
              />
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            size="lg"
            variant={eintrag.status === 'erledigt' ? 'outline' : 'default'}
            className="flex-1"
            onClick={() => onErledigen(eintrag)}
          >
            <Check aria-hidden />
            {eintrag.status === 'erledigt' ? 'Eintrag ändern' : 'Erledigt'}
          </Button>
          {eintrag.status === 'erledigt' && (
            <Button
              size="lg"
              variant="ghost"
              onClick={zurueck}
              disabled={pending}
              aria-label={`${eintrag.titel} nicht erledigt`}
            >
              <Undo2 aria-hidden />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

/** Datum, Ort, Notiz und Foto zu einem erledigten Termin. */
function ErledigtDialog({
  childId,
  eintrag,
  onClose,
}: {
  childId: string
  eintrag: VorsorgeView | null
  onClose: () => void
}) {
  const [doneAt, setDoneAt] = useState('')
  const [ort, setOrt] = useState('')
  const [note, setNote] = useState('')
  const [photos, setPhotos] = useState<UploadedPhoto[]>([])
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const { toast } = useToast()
  const router = useRouter()

  // Beim Öffnen den gespeicherten Stand übernehmen.
  const openedKey = useRef<string | null>(null)
  if (eintrag && openedKey.current !== eintrag.key) {
    openedKey.current = eintrag.key
    setDoneAt(
      eintrag.doneAt ? eintrag.doneAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
    )
    setOrt(eintrag.ort ?? '')
    setNote(eintrag.note ?? '')
    setPhotos(eintrag.photo ? [eintrag.photo] : [])
    setError(null)
  }

  function speichern() {
    if (!eintrag) return
    setError(null)
    startTransition(async () => {
      const result = await markVorsorgeDoneAction({
        childId,
        kind: eintrag.kind,
        templateKey: eintrag.key,
        doneAt,
        ort,
        note,
        mediaId: photos[0]?.id ?? null,
      })
      if ('error' in result) {
        setError(result.error)
        return
      }
      toast({
        title: 'Eingetragen',
        description:
          eintrag.kind === 'impfung'
            ? 'Die Impfung steht jetzt auch im Verlauf unter Gesundheit.'
            : undefined,
      })
      openedKey.current = null
      onClose()
      router.refresh()
    })
  }

  return (
    <Dialog open={Boolean(eintrag)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{eintrag?.titel}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="vorsorgeDatum">Wann war das?</Label>
            <Input
              id="vorsorgeDatum"
              type="date"
              value={doneAt}
              onChange={(event) => setDoneAt(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="vorsorgeOrt">Wo?</Label>
            <Input
              id="vorsorgeOrt"
              value={ort}
              maxLength={120}
              placeholder="Ordination, Ambulanz, Beratungsstelle …"
              onChange={(event) => setOrt(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="vorsorgeNotiz">Notiz</Label>
            <Textarea
              id="vorsorgeNotiz"
              rows={3}
              maxLength={1000}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>
          <PhotoUpload
            childId={childId}
            photos={photos}
            onChange={setPhotos}
            max={1}
            label="Foto vom Eintrag im Pass"
          />
          {error && (
            <p role="alert" data-testid="form-error" className="text-sm font-medium text-destructive">
              {error}
            </p>
          )}
          <Button size="lg" onClick={speichern} disabled={pending}>
            {pending ? 'Speichert …' : 'Speichern'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** Quelle und Stand gehoeren unter jede Ansicht – sonst weiss niemand, worauf sie sich stuetzt. */
function Quellen({ quellen }: { quellen: QuellenAngabe[] }) {
  return (
    <footer className="flex flex-col gap-3 border-t border-border pt-4 text-sm text-muted-foreground">
      {quellen.map((quelle) => (
        <div key={quelle.titel}>
          <p>
            <span className="font-semibold text-foreground">{quelle.titel}:</span> {quelle.quelle} ·{' '}
            {quelle.version} · Stand {quelle.stand} · abgerufen am {quelle.abgerufenAm}
          </p>
          {!quelle.geprueft && quelle.pruefhinweis && (
            <p className="mt-1.5 flex gap-2 rounded-lg border border-border bg-muted/40 p-3">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>{quelle.pruefhinweis}</span>
            </p>
          )}
        </div>
      ))}
      <p className="flex items-center gap-2">
        <CircleDot className="size-3" aria-hidden />
        Ungeprüfte Angaben immer gegen den Eltern-Kind-Pass und den aktuellen Impfplan abgleichen.
      </p>
    </footer>
  )
}
