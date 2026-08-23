'use client'
import { useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Mic, Music, Trash2, Upload } from 'lucide-react'
import {
  TON_TAGS,
  TON_TAG_LABEL,
  dauerText,
  filtere,
  groesseText,
  titelVorschlag,
  type TonTag,
} from '@/lib/audio/notes'
import { enqueueAudio, newClientId } from '@/lib/offline/queue'
import { flushQueue } from '@/lib/offline/sync'
import { deleteAudioNoteAction, saveAudioNoteAction } from '@/lib/actions/audio'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EmptyState } from '@/components/ui/empty-state'
import { UserAvatar } from '@/components/ui/avatar'
import { useToast } from '@/components/ui/toast'
import { AudioPlayer } from '@/components/audio/audio-player'
import { GroessenHinweis, Recorder, type Aufnahme } from '@/components/audio/recorder'
import { cn } from '@/lib/utils'
import type { TonView } from './types'

const KEIN_MEILENSTEIN = 'keiner'

export function ToeneAnsicht({
  childId,
  childName,
  toene,
  meilensteine,
  ffmpegVorhanden,
}: {
  childId: string
  childName: string
  toene: TonView[]
  meilensteine: { id: string; title: string }[]
  ffmpegVorhanden: boolean
}) {
  const [aufnehmen, setAufnehmen] = useState(false)
  const [bearbeiten, setBearbeiten] = useState<TonView | null>(null)
  const [tagFilter, setTagFilter] = useState<TonTag | null>(null)
  const [suche, setSuche] = useState('')
  const [hochladen, startHochladen] = useTransition()
  const dateiFeld = useRef<HTMLInputElement | null>(null)
  const { toast } = useToast()
  const router = useRouter()

  const sichtbar = useMemo(
    () => filtere(toene, { tag: tagFilter, suche }),
    [toene, tagFilter, suche],
  )

  const benutzteTags = useMemo(() => {
    const gesehen = new Set<TonTag>()
    for (const ton of toene) for (const tag of ton.tags) gesehen.add(tag)
    return TON_TAGS.filter((tag) => gesehen.has(tag))
  }, [toene])

  /** Gemeinsamer Weg für Aufnahme und Upload: erst in die Queue, dann senden. */
  async function inDieQueue(input: {
    bytes: ArrayBuffer
    mimeType: string
    titel?: string
  }) {
    const jetzt = new Date()
    await enqueueAudio({
      clientId: newClientId(),
      childId,
      title: input.titel?.trim() || titelVorschlag(jetzt),
      recordedAt: jetzt.toISOString(),
      tags: [],
      milestoneId: null,
      bytes: input.bytes,
      mimeType: input.mimeType,
      queuedAt: jetzt.toISOString(),
    })

    const summary = await flushQueue()
    if (summary.audioApplied > 0) {
      toast({ title: 'Gespeichert' })
    } else {
      toast({
        title: 'Gemerkt',
        description: 'Die Aufnahme geht raus, sobald wieder Verbindung da ist.',
      })
    }
    router.refresh()
  }

  function aufnahmeFertig(aufnahme: Aufnahme) {
    setAufnehmen(false)
    startHochladen(async () => {
      await inDieQueue({ bytes: aufnahme.bytes, mimeType: aufnahme.mimeType })
    })
  }

  function dateiGewaehlt(datei: File | undefined) {
    if (!datei) return
    startHochladen(async () => {
      await inDieQueue({
        bytes: await datei.arrayBuffer(),
        mimeType: datei.type || 'application/octet-stream',
        titel: datei.name.replace(/\.[a-z0-9]{1,5}$/i, ''),
      })
      if (dateiFeld.current) dateiFeld.current.value = ''
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold">Töne</h1>
        <p className="text-muted-foreground">
          Wie {childName} klingt – das vergisst man schneller, als man denkt.
        </p>
      </div>

      {!ffmpegVorhanden && (
        <p className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
          Auf diesem Server fehlt <code>ffmpeg</code>. Ohne es lassen sich Aufnahmen nicht
          umwandeln – im mitgelieferten Docker-Image ist es enthalten.
        </p>
      )}

      <div className="flex flex-col gap-2">
        <Button size="lg" onClick={() => setAufnehmen(true)} disabled={hochladen}>
          <Mic aria-hidden />
          Aufnehmen
        </Button>
        <Button
          size="lg"
          variant="outline"
          disabled={hochladen}
          onClick={() => dateiFeld.current?.click()}
        >
          <Upload aria-hidden />
          Datei hochladen
        </Button>
        <input
          ref={dateiFeld}
          type="file"
          accept="audio/mpeg,audio/mp4,audio/wav,audio/ogg,audio/flac,.mp3,.m4a,.wav,.ogg,.flac"
          className="sr-only"
          aria-label="Audiodatei auswählen"
          onChange={(event) => dateiGewaehlt(event.target.files?.[0])}
        />
        {hochladen && <p className="text-sm text-muted-foreground">Wird verarbeitet …</p>}
      </div>

      {toene.length > 0 && (
        <div className="flex flex-col gap-2">
          <Input
            value={suche}
            onChange={(event) => setSuche(event.target.value)}
            placeholder="Nach Titel suchen"
            aria-label="Nach Titel suchen"
          />
          {benutzteTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setTagFilter(null)}
                aria-pressed={tagFilter === null}
                className={cn(
                  'min-h-10 rounded-full border-2 px-3 text-sm font-semibold',
                  tagFilter === null ? 'border-primary bg-primary/10' : 'border-border',
                )}
              >
                Alle
              </button>
              {benutzteTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
                  aria-pressed={tagFilter === tag}
                  className={cn(
                    'min-h-10 rounded-full border-2 px-3 text-sm font-semibold',
                    tagFilter === tag ? 'border-primary bg-primary/10' : 'border-border',
                  )}
                >
                  {TON_TAG_LABEL[tag]}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {toene.length === 0 ? (
        <EmptyState
          icon={Music}
          title="Noch keine Aufnahme"
          description="Ein Lachen, ein Brabbeln, das Schnaufen beim Einschlafen – drei Minuten reichen dafür."
        />
      ) : sichtbar.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Zu diesem Filter gibt es nichts.
        </p>
      ) : (
        <ul className="flex flex-col gap-3" data-testid="ton-liste">
          {sichtbar.map((ton) => (
            <li key={ton.id}>
              <Card>
                <CardContent className="flex flex-col gap-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold">{ton.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {ton.recordedAtText} · {dauerText(ton.durationSec)} ·{' '}
                        {groesseText(ton.bytes)}
                      </p>
                    </div>
                    {ton.createdBy && (
                      <UserAvatar
                        initials={ton.createdBy.initials}
                        color={ton.createdBy.color}
                        title={ton.createdBy.displayName}
                      />
                    )}
                  </div>

                  <AudioPlayer
                    id={ton.id}
                    src={ton.src}
                    titel={ton.title}
                    untertitel={childName}
                    peaks={ton.peaks}
                    durationSec={ton.durationSec}
                  />

                  {(ton.tags.length > 0 || ton.milestoneTitle) && (
                    <div className="flex flex-wrap gap-1.5">
                      {ton.tags.map((tag) => (
                        <Badge key={tag} variant="secondary">
                          {TON_TAG_LABEL[tag]}
                        </Badge>
                      ))}
                      {ton.milestoneTitle && (
                        <Badge variant="outline">{ton.milestoneTitle}</Badge>
                      )}
                    </div>
                  )}

                  <Button variant="outline" onClick={() => setBearbeiten(ton)}>
                    Bearbeiten
                  </Button>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={aufnehmen} onOpenChange={setAufnehmen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aufnehmen</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Das Mikrofon wird erst freigegeben, wenn du auf den Knopf drückst.
          </p>
          <Recorder onFertig={aufnahmeFertig} />
        </DialogContent>
      </Dialog>

      <TonDialog
        ton={bearbeiten}
        meilensteine={meilensteine}
        onClose={() => setBearbeiten(null)}
      />
    </div>
  )
}

function TonDialog({
  ton,
  meilensteine,
  onClose,
}: {
  ton: TonView | null
  meilensteine: { id: string; title: string }[]
  onClose: () => void
}) {
  const [titel, setTitel] = useState('')
  const [tags, setTags] = useState<TonTag[]>([])
  const [milestoneId, setMilestoneId] = useState(KEIN_MEILENSTEIN)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const { toast } = useToast()
  const router = useRouter()

  const geoeffnet = useRef<string | null>(null)
  if (ton && geoeffnet.current !== ton.id) {
    geoeffnet.current = ton.id
    setTitel(ton.title)
    setTags(ton.tags)
    setMilestoneId(ton.milestoneId ?? KEIN_MEILENSTEIN)
    setError(null)
  }

  function speichern() {
    if (!ton) return
    setError(null)
    startTransition(async () => {
      const result = await saveAudioNoteAction({
        id: ton.id,
        title: titel,
        recordedAt: ton.recordedAt,
        tags,
        milestoneId: milestoneId === KEIN_MEILENSTEIN ? null : milestoneId,
      })
      if ('error' in result) {
        setError(result.error)
        return
      }
      toast({ title: 'Gespeichert' })
      geoeffnet.current = null
      onClose()
      router.refresh()
    })
  }

  function loeschen() {
    if (!ton) return
    startTransition(async () => {
      const result = await deleteAudioNoteAction(ton.id)
      if ('error' in result) {
        setError(result.error)
        return
      }
      toast({ title: 'Gelöscht' })
      geoeffnet.current = null
      onClose()
      router.refresh()
    })
  }

  return (
    <Dialog open={Boolean(ton)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Aufnahme bearbeiten</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tonTitel">Titel</Label>
            <Input
              id="tonTitel"
              value={titel}
              maxLength={120}
              onChange={(event) => setTitel(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Schlagworte</Label>
            <div className="flex flex-wrap gap-2">
              {TON_TAGS.map((tag) => {
                const aktiv = tags.includes(tag)
                return (
                  <button
                    key={tag}
                    type="button"
                    aria-pressed={aktiv}
                    onClick={() =>
                      setTags(aktiv ? tags.filter((t) => t !== tag) : [...tags, tag])
                    }
                    className={cn(
                      'min-h-12 rounded-full border-2 px-4 text-sm font-semibold',
                      aktiv ? 'border-primary bg-primary/10' : 'border-border',
                    )}
                  >
                    {TON_TAG_LABEL[tag]}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tonMeilenstein">Zu einem Meilenstein</Label>
            <Select value={milestoneId} onValueChange={setMilestoneId}>
              <SelectTrigger id="tonMeilenstein">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={KEIN_MEILENSTEIN}>Keiner</SelectItem>
                {meilensteine.map((meilenstein) => (
                  <SelectItem key={meilenstein.id} value={meilenstein.id}>
                    {meilenstein.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {ton && <GroessenHinweis bytes={ton.bytes} />}

          {error && (
            <p role="alert" data-testid="form-error" className="text-sm font-medium text-destructive">
              {error}
            </p>
          )}

          <Button size="lg" onClick={speichern} disabled={pending}>
            {pending ? 'Speichert …' : 'Speichern'}
          </Button>
          <Button variant="ghost" onClick={loeschen} disabled={pending}>
            <Trash2 aria-hidden />
            Aufnahme löschen
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
