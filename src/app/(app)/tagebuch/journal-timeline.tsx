'use client'
import { useState, useTransition } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BookHeart, Plus, Trash2 } from 'lucide-react'
import { deleteJournalEntryAction, saveJournalEntryAction } from '@/lib/actions/journal'
import { formatDateLong, formatDateShort } from '@/lib/time'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { UserAvatar } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { useToast } from '@/components/ui/toast'
import { PhotoUpload, type UploadedPhoto } from '@/components/journal/photo-upload'
import { cn } from '@/lib/utils'
import { localeTag } from '@/lib/i18n'

type Member = { id: string; displayName: string; initials: string; color: string }

export type JournalEntryView = {
  id: string
  happenedAt: string
  title: string | null
  body: string
  tags: string[]
  mood: number | null
  monthPhoto: number | null
  createdBy: Member | null
  media: UploadedPhoto[]
}

const MOOD_LABEL = ['schwerer Tag', 'anstrengend', 'geht so', 'schön', 'wunderbar']

export function JournalTimeline({
  childId,
  childName,
  currentMonth,
  entries,
  knownTags,
  activeTag,
  activeMonth,
  availableMonths,
  geteilteFotos = [],
  geteilterTitel = null,
  geteiltOffline = false,
}: {
  childId: string
  childName: string
  currentMonth: number | null
  entries: JournalEntryView[]
  knownTags: string[]
  activeTag: string | null
  activeMonth: string | null
  availableMonths: string[]
  /** Ueber "Teilen" hereingereichte Fotos – haengen gleich am neuen Eintrag. */
  geteilteFotos?: UploadedPhoto[]
  geteilterTitel?: string | null
  /** Ueber "Teilen" ohne Netz angekommen – liegt in der Queue. */
  geteiltOffline?: boolean
}) {
  const [editing, setEditing] = useState<JournalEntryView | 'new' | null>(
    geteilteFotos.length > 0 ? 'new' : null,
  )
  const [pending, startTransition] = useTransition()
  const { toast } = useToast()
  const router = useRouter()

  function remove(entry: JournalEntryView) {
    startTransition(async () => {
      const result = await deleteJournalEntryAction(entry.id)
      if ('error' in result) {
        toast({ title: 'Nicht gelöscht', description: result.error, variant: 'destructive' })
      } else {
        toast({ title: 'Eintrag gelöscht' })
      }
      router.refresh()
    })
  }

  function filterHref(next: { tag?: string | null; monat?: string | null }): string {
    const params = new URLSearchParams()
    const tag = next.tag === undefined ? activeTag : next.tag
    const monat = next.monat === undefined ? activeMonth : next.monat
    if (tag) params.set('tag', tag)
    if (monat) params.set('monat', monat)
    const query = params.toString()
    return query ? `/tagebuch?${query}` : '/tagebuch'
  }

  return (
    <div className="flex flex-col gap-4">
      {geteiltOffline && (
        <p className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
          Ohne Verbindung geteilt – die Datei liegt in der Queue und geht raus, sobald wieder Netz
          da ist.
        </p>
      )}

      <Button size="lg" onClick={() => setEditing('new')}>
        <Plus aria-hidden />
        Eintrag schreiben
      </Button>

      {(knownTags.length > 0 || availableMonths.length > 1) && (
        <div className="flex flex-col gap-2">
          {knownTags.length > 0 && (
            <nav aria-label="Nach Schlagwort filtern">
              <ul className="flex gap-2 overflow-x-auto pb-1">
                <li>
                  <Link
                    href={filterHref({ tag: null })}
                    className={cn(
                      'flex min-h-10 items-center whitespace-nowrap rounded-full border-2 px-3 text-sm font-semibold',
                      activeTag === null ? 'border-primary bg-primary/10 text-primary' : 'border-border',
                    )}
                  >
                    Alle
                  </Link>
                </li>
                {knownTags.map((tag) => (
                  <li key={tag}>
                    <Link
                      href={filterHref({ tag })}
                      className={cn(
                        'flex min-h-10 items-center whitespace-nowrap rounded-full border-2 px-3 text-sm font-semibold',
                        activeTag === tag ? 'border-primary bg-primary/10 text-primary' : 'border-border',
                      )}
                    >
                      {tag}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}
          {availableMonths.length > 1 && (
            <nav aria-label="Nach Monat filtern">
              <ul className="flex gap-2 overflow-x-auto pb-1">
                <li>
                  <Link
                    href={filterHref({ monat: null })}
                    className={cn(
                      'flex min-h-10 items-center whitespace-nowrap rounded-full border px-3 text-xs',
                      activeMonth === null ? 'border-primary text-primary' : 'border-border text-muted-foreground',
                    )}
                  >
                    Alle Monate
                  </Link>
                </li>
                {availableMonths.map((month) => (
                  <li key={month}>
                    <Link
                      href={filterHref({ monat: month })}
                      className={cn(
                        'flex min-h-10 items-center whitespace-nowrap rounded-full border px-3 text-xs',
                        activeMonth === month ? 'border-primary text-primary' : 'border-border text-muted-foreground',
                      )}
                    >
                      {monthLabel(month)}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </div>
      )}

      {entries.length === 0 ? (
        <EmptyState
          icon={BookHeart}
          title="Noch nichts aufgeschrieben"
          description={`Die kleinen Sachen vergisst man am schnellsten. Ein Satz über ${childName} reicht.`}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {entries.map((entry) => (
            <li key={entry.id}>
              <Card>
                <CardContent className="flex flex-col gap-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm text-muted-foreground">
                        {formatDateLong(new Date(entry.happenedAt))}
                      </p>
                      {entry.title && <h2 className="font-display text-lg font-semibold">{entry.title}</h2>}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {entry.createdBy && (
                        <UserAvatar
                          size="sm"
                          initials={entry.createdBy.initials}
                          color={entry.createdBy.color}
                          title={`Geschrieben von ${entry.createdBy.displayName}`}
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => setEditing(entry)}
                        className="min-h-10 rounded-lg px-2 text-sm font-semibold text-primary"
                      >
                        Bearbeiten
                      </button>
                    </div>
                  </div>

                  {entry.media.length > 0 && (
                    <ul
                      className={cn(
                        'grid gap-1.5',
                        entry.media.length === 1 ? 'grid-cols-1' : 'grid-cols-3',
                      )}
                    >
                      {entry.media.map((photo) => (
                        <li key={photo.id}>
                          <Image
                            src={`/api/uploads/${photo.thumbPath}`}
                            alt=""
                            width={480}
                            height={480}
                            className={cn(
                              'w-full rounded-lg object-cover',
                              entry.media.length === 1 ? 'max-h-80' : 'aspect-square',
                            )}
                            unoptimized
                          />
                        </li>
                      ))}
                    </ul>
                  )}

                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{entry.body}</p>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {entry.monthPhoto !== null && (
                      <Badge>Monatsfoto {entry.monthPhoto}</Badge>
                    )}
                    {entry.mood !== null && (
                      <Badge variant="secondary">{MOOD_LABEL[entry.mood - 1]}</Badge>
                    )}
                    {entry.tags.map((tag) => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                    <button
                      type="button"
                      onClick={() => remove(entry)}
                      disabled={pending}
                      aria-label="Eintrag löschen"
                      className="ml-auto flex size-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-destructive"
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <JournalDialog
        geteilteFotos={geteilteFotos}
        geteilterTitel={geteilterTitel}
        childId={childId}
        currentMonth={currentMonth}
        knownTags={knownTags}
        entry={editing === 'new' ? null : editing}
        open={editing !== null}
        onOpenChange={(next) => !next && setEditing(null)}
      />
    </div>
  )
}

function monthLabel(month: string): string {
  const [year, monthPart] = month.split('-')
  return new Date(Date.UTC(Number(year), Number(monthPart) - 1, 1)).toLocaleDateString(localeTag(), {
    month: 'short',
    year: '2-digit',
    timeZone: 'UTC',
  })
}

function JournalDialog({
  childId,
  currentMonth,
  knownTags,
  entry,
  open,
  onOpenChange,
  geteilteFotos = [],
  geteilterTitel = null,
}: {
  childId: string
  currentMonth: number | null
  knownTags: string[]
  entry: JournalEntryView | null
  open: boolean
  onOpenChange: (open: boolean) => void
  geteilteFotos?: UploadedPhoto[]
  geteilterTitel?: string | null
}) {
  const [photos, setPhotos] = useState<UploadedPhoto[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [mood, setMood] = useState<number | null>(null)
  const [isMonthPhoto, setIsMonthPhoto] = useState(false)
  const [happenedAt, setHappenedAt] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [loadedFor, setLoadedFor] = useState<string | null>(null)
  const { toast } = useToast()
  const router = useRouter()

  if (open && loadedFor !== (entry?.id ?? 'new')) {
    // Geteilte Fotos gelten nur fuer einen neuen Eintrag – beim Bearbeiten
    // haetten sie nichts verloren.
    setPhotos(entry?.media ?? geteilteFotos)
    setTags(entry?.tags ?? [])
    setMood(entry?.mood ?? null)
    setIsMonthPhoto(entry?.monthPhoto !== null && entry?.monthPhoto !== undefined)
    setHappenedAt(
      toLocalInput(
        entry?.happenedAt ?? geteilteFotos[0]?.takenAt ?? new Date().toISOString(),
      ),
    )
    setError(null)
    setLoadedFor(entry?.id ?? 'new')
  }
  if (!open && loadedFor !== null) setLoadedFor(null)

  function submit(formData: FormData) {
    setError(null)
    const extraTags = String(formData.get('newTag') ?? '')
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)

    startTransition(async () => {
      const result = await saveJournalEntryAction({
        id: entry?.id,
        childId,
        happenedAt: new Date(happenedAt).toISOString(),
        title: String(formData.get('title') ?? ''),
        body: String(formData.get('body') ?? ''),
        tags: [...new Set([...tags, ...extraTags])],
        mood,
        monthPhoto: isMonthPhoto ? (entry?.monthPhoto ?? currentMonth) : null,
        mediaIds: photos.map((photo) => photo.id),
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{entry ? 'Eintrag bearbeiten' : 'Neuer Eintrag'}</DialogTitle>
        </DialogHeader>
        <form action={submit} className="flex flex-col gap-4">
          <PhotoUpload
            childId={childId}
            photos={photos}
            onChange={setPhotos}
            onTakenAt={(takenAt) => setHappenedAt(toLocalInput(takenAt))}
          />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="happenedAt">Wann war das?</Label>
            <Input
              id="happenedAt"
              type="datetime-local"
              value={happenedAt}
              onChange={(event) => setHappenedAt(event.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">Überschrift (optional)</Label>
            <Input
              id="title"
              name="title"
              maxLength={120}
              defaultValue={entry?.title ?? geteilterTitel ?? ''}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="body">Was ist passiert?</Label>
            <Textarea id="body" name="body" rows={6} required defaultValue={entry?.body ?? ''} />
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-semibold text-muted-foreground">Schlagwörter</legend>
            {knownTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {knownTags.map((tag) => {
                  const active = tags.includes(tag)
                  return (
                    <button
                      key={tag}
                      type="button"
                      aria-pressed={active}
                      onClick={() =>
                        setTags((current) =>
                          active ? current.filter((entry) => entry !== tag) : [...current, tag],
                        )
                      }
                      className={cn(
                        'min-h-10 rounded-full border-2 px-3 text-sm font-semibold',
                        active ? 'border-primary bg-primary/10 text-primary' : 'border-border',
                      )}
                    >
                      {tag}
                    </button>
                  )
                })}
              </div>
            )}
            <Input name="newTag" placeholder="Neue Schlagwörter, mit Komma getrennt" maxLength={200} />
          </fieldset>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mood">
              Stimmung {mood !== null && <span className="text-foreground">· {MOOD_LABEL[mood - 1]}</span>}
            </Label>
            <Slider
              id="mood"
              min={1}
              max={5}
              step={1}
              value={[mood ?? 3]}
              onValueChange={([value]) => setMood(value ?? 3)}
              aria-label="Stimmung von 1 bis 5"
            />
          </div>

          {currentMonth !== null && (
            <label className="flex min-h-12 items-center gap-3 rounded-xl border-2 border-border px-4">
              <input
                type="checkbox"
                checked={isMonthPhoto}
                onChange={(event) => setIsMonthPhoto(event.target.checked)}
                className="size-6"
              />
              <span className="text-sm font-semibold">
                Als Monatsfoto für Monat {entry?.monthPhoto ?? currentMonth} markieren
              </span>
            </label>
          )}

          {error && (
            <p role="alert" data-testid="form-error" className="text-sm font-medium text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? 'Speichert …' : 'Speichern'}
          </Button>
          {entry && (
            <p className="text-center text-xs text-muted-foreground">
              Angelegt am {formatDateShort(new Date(entry.happenedAt))}
            </p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  )
}

function toLocalInput(iso: string): string {
  const date = new Date(iso)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}
