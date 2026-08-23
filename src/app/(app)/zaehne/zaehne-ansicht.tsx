'use client'
import { useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Printer, Trash2 } from 'lucide-react'
import { deleteToothAction, saveToothAction } from '@/lib/actions/teeth'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { PhotoUpload, type UploadedPhoto } from '@/components/journal/photo-upload'
import { ToothChart, type ZahnAnzeige } from '@/components/teeth/tooth-chart'
import type { ZahnEckdaten, ZahnView } from './types'

const SEITE_LABEL = { rechts: 'rechts', links: 'links' } as const
const KIEFER_LABEL = { oben: 'oben', unten: 'unten' } as const

const STATUS_TEXT = {
  da: 'da',
  ausgefallen: 'ausgefallen',
  erwartet: 'wird erwartet',
  offen: 'noch nicht dran',
} as const

export function ZaehneAnsicht({
  childId,
  childName,
  hatGeburtsdatum,
  zaehne,
  anzahlDa,
  anzahlGesamt,
  anzahlAusgefallen,
  erster,
  letzter,
}: {
  childId: string
  childName: string
  hatGeburtsdatum: boolean
  zaehne: ZahnView[]
  anzahlDa: number
  anzahlGesamt: number
  anzahlAusgefallen: number
  erster: ZahnEckdaten | null
  letzter: ZahnEckdaten | null
}) {
  const [gewaehlt, setGewaehlt] = useState<string | null>(null)

  const byKey = useMemo(() => new Map(zaehne.map((z) => [z.key, z])), [zaehne])

  const anzeige: ZahnAnzeige[] = zaehne.map((zahn) => ({
    key: zahn.key,
    status: zahn.status,
    label: `${zahn.name} ${KIEFER_LABEL[zahn.kiefer]} ${SEITE_LABEL[zahn.seite]} · ${
      STATUS_TEXT[zahn.status]
    }`,
  }))

  const eingetragen = zaehne
    .filter((z) => z.eruptedOn)
    .sort((a, b) => (a.eruptedOn! < b.eruptedOn! ? -1 : 1))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl font-bold">Zähne</h1>
          <p className="text-muted-foreground">
            {anzahlDa} von {anzahlGesamt} Milchzähnen
            {anzahlAusgefallen > 0 ? ` · ${anzahlAusgefallen} ausgefallen` : ''}
          </p>
        </div>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground print:hidden">
          <Printer className="size-4" aria-hidden />
          Über das Browser-Menü drucken
        </p>
      </div>

      <div className="flex justify-center">
        <ToothChart zaehne={anzeige} onSelect={setGewaehlt} selected={gewaehlt} />
      </div>

      <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <li className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm bg-primary" aria-hidden /> da
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm border border-dashed border-muted-foreground/60" aria-hidden />
          wird erwartet
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm border border-border" aria-hidden /> noch nicht dran
        </li>
      </ul>

      {!hatGeburtsdatum && (
        <p className="text-sm text-muted-foreground">
          Ohne Geburtsdatum im Kindprofil steht hier kein Zeitraum – eingetragen werden können die
          Zähne trotzdem.
        </p>
      )}

      {(erster || letzter) && (
        <Card>
          <CardContent className="flex flex-col gap-2 p-4 text-sm">
            {erster && (
              <p>
                <span className="font-semibold">Erster Zahn:</span> {erster.name} am {erster.datum}
                {erster.lebensmonat !== null ? ` · ${erster.lebensmonat}. Lebensmonat` : ''}
              </p>
            )}
            {letzter && (
              <p>
                <span className="font-semibold">Zuletzt:</span> {letzter.name} am {letzter.datum}
                {letzter.lebensmonat !== null ? ` · ${letzter.lebensmonat}. Lebensmonat` : ''}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {eingetragen.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
            Eingetragen
          </h2>
          <ul className="overflow-hidden rounded-xl border border-border bg-card">
            {eingetragen.map((zahn) => (
              <li key={zahn.key} className="border-b border-border last:border-b-0">
                <button
                  type="button"
                  onClick={() => setGewaehlt(zahn.key)}
                  className="flex min-h-12 w-full items-center gap-3 p-3 text-left hover:bg-accent"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">
                      {zahn.name} {KIEFER_LABEL[zahn.kiefer]} {SEITE_LABEL[zahn.seite]}
                    </span>
                    <span className="block text-sm text-muted-foreground">
                      {zahn.eruptedOnText}
                      {zahn.lebensmonat !== null ? ` · ${zahn.lebensmonat}. Lebensmonat` : ''}
                      {zahn.lostOnText ? ` · ausgefallen am ${zahn.lostOnText}` : ''}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-sm text-muted-foreground">
        Die Zeitangaben sind grobe Spannen. Zwischen dem ersten Zahn mit vier Monaten und dem ersten
        Zahn mit einem Jahr liegt nichts als Zufall – {childName} hat da seinen eigenen Takt.
      </p>

      <ZahnDialog
        childId={childId}
        zahn={gewaehlt ? (byKey.get(gewaehlt) ?? null) : null}
        onClose={() => setGewaehlt(null)}
      />
    </div>
  )
}

function ZahnDialog({
  childId,
  zahn,
  onClose,
}: {
  childId: string
  zahn: ZahnView | null
  onClose: () => void
}) {
  const [eruptedOn, setEruptedOn] = useState('')
  const [lostOn, setLostOn] = useState('')
  const [note, setNote] = useState('')
  const [photos, setPhotos] = useState<UploadedPhoto[]>([])
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const { toast } = useToast()
  const router = useRouter()

  const openedKey = useRef<string | null>(null)
  if (zahn && openedKey.current !== zahn.key) {
    openedKey.current = zahn.key
    setEruptedOn(zahn.eruptedOn ? zahn.eruptedOn.slice(0, 10) : '')
    setLostOn(zahn.lostOn ? zahn.lostOn.slice(0, 10) : '')
    setNote(zahn.note ?? '')
    setPhotos(zahn.photo ? [zahn.photo] : [])
    setError(null)
  }

  function speichern() {
    if (!zahn) return
    setError(null)
    startTransition(async () => {
      const result = await saveToothAction({
        childId,
        toothKey: zahn.key,
        eruptedOn: eruptedOn || null,
        lostOn: lostOn || null,
        note,
        mediaId: photos[0]?.id ?? null,
      })
      if ('error' in result) {
        setError(result.error)
        return
      }
      toast({ title: 'Gespeichert' })
      openedKey.current = null
      onClose()
      router.refresh()
    })
  }

  function loeschen() {
    if (!zahn) return
    startTransition(async () => {
      const result = await deleteToothAction(childId, zahn.key)
      if ('error' in result) {
        setError(result.error)
        return
      }
      toast({ title: 'Eintrag entfernt' })
      openedKey.current = null
      onClose()
      router.refresh()
    })
  }

  const heute = new Date().toISOString().slice(0, 10)

  return (
    <Dialog open={Boolean(zahn)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {zahn ? `${zahn.name} ${KIEFER_LABEL[zahn.kiefer]} ${SEITE_LABEL[zahn.seite]}` : ''}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            {zahn?.durchbruchText}, {zahn?.ausfallText}. Das ist eine Spanne, kein Termin.
          </p>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="zahnDurchbruch">Durchgebrochen am</Label>
            <div className="flex gap-2">
              <Input
                id="zahnDurchbruch"
                type="date"
                value={eruptedOn}
                onChange={(event) => setEruptedOn(event.target.value)}
              />
              <Button type="button" variant="outline" onClick={() => setEruptedOn(heute)}>
                Heute
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="zahnAusfall">Ausgefallen am</Label>
            <Input
              id="zahnAusfall"
              type="date"
              value={lostOn}
              onChange={(event) => setLostOn(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="zahnNotiz">Notiz</Label>
            <Textarea
              id="zahnNotiz"
              rows={3}
              maxLength={500}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>

          <PhotoUpload
            childId={childId}
            photos={photos}
            onChange={setPhotos}
            max={1}
            label="Foto hinzufügen"
          />

          {zahn?.photo && photos.length > 0 && (
            <Image
              src={`/api/uploads/${photos[0]!.thumbPath}`}
              alt=""
              width={160}
              height={160}
              unoptimized
              className="aspect-square w-24 rounded-lg object-cover"
            />
          )}

          {error && (
            <p role="alert" data-testid="form-error" className="text-sm font-medium text-destructive">
              {error}
            </p>
          )}

          <Button size="lg" onClick={speichern} disabled={pending}>
            {pending ? 'Speichert …' : 'Speichern'}
          </Button>
          {(zahn?.eruptedOn || zahn?.lostOn || zahn?.note) && (
            <Button variant="ghost" onClick={loeschen} disabled={pending}>
              <Trash2 aria-hidden />
              Eintrag entfernen
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
