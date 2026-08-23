'use client'
import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Clock, Trash2 } from 'lucide-react'
import { createEventAction, deleteEventAction, updateEventAction } from '@/lib/actions/events'
import { savePortionAction } from '@/lib/actions/milk'
import { meldeDuplikat } from './duplicate-banner'
import { restoreEventAction } from '@/lib/actions/events'
import { EVENT_CATEGORIES, type EventType } from '@/lib/events/types'
import { formatDuration } from '@/lib/time'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { PayloadFields, type PayloadState } from './payload-fields'

export type EditableEvent = {
  id: string
  type: string
  startedAt: string
  endedAt: string | null
  payload: unknown
  note: string | null
}

/** Lokale Wanduhrzeit fuer <input type="datetime-local">. */
function toLocalInput(iso: string): string {
  const date = new Date(iso)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

function fromLocalInput(value: string): string | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

/** Menge einer Abpump-Sitzung – entweder direkt oder aus beiden Seiten. */
function abgepumpteMenge(payload: unknown): number {
  const data = payload as { amountMl?: number; leftMl?: number; rightMl?: number }
  const gesamt = data.amountMl ?? (data.leftMl ?? 0) + (data.rightMl ?? 0)
  return Math.round(Math.max(0, gesamt))
}

export function EventDialog({
  childId,
  type,
  event,
  open,
  onOpenChange,
  suggestions,
  lastNursingSide,
  defaultStartedAt,
}: {
  childId: string
  type: EventType
  event?: EditableEvent | null
  open: boolean
  onOpenChange: (open: boolean) => void
  suggestions?: string[]
  lastNursingSide?: string | null
  defaultStartedAt?: string
}) {
  const category = EVENT_CATEGORIES[type]
  const [payload, setPayload] = useState<PayloadState>({})
  const [startedAt, setStartedAt] = useState('')
  const [endedAt, setEndedAt] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const { toast } = useToast()
  const router = useRouter()

  // Beim Öffnen befuellen – auch beim Wechsel zwischen zwei Eintraegen.
  useEffect(() => {
    if (!open) return
    if (event) {
      setPayload((event.payload && typeof event.payload === 'object' ? { ...event.payload } : {}) as PayloadState)
      setStartedAt(toLocalInput(event.startedAt))
      setEndedAt(event.endedAt ? toLocalInput(event.endedAt) : '')
      setNote(event.note ?? '')
    } else {
      setPayload({})
      setStartedAt(toLocalInput(defaultStartedAt ?? new Date().toISOString()))
      setEndedAt('')
      setNote('')
    }
    setError(null)
  }, [open, event, defaultStartedAt])

  const durationHint = useMemo(() => {
    if (!category.timed || !startedAt || !endedAt) return null
    const start = new Date(startedAt).getTime()
    const end = new Date(endedAt).getTime()
    if (Number.isNaN(start) || Number.isNaN(end) || end < start) return null
    return formatDuration((end - start) / 1000)
  }, [category.timed, startedAt, endedAt])

  function save() {
    setError(null)
    const startIso = fromLocalInput(startedAt)
    if (!startIso) {
      setError('Bitte einen gültigen Beginn eintragen.')
      return
    }
    const endIso = endedAt ? fromLocalInput(endedAt) : null
    if (endedAt && !endIso) {
      setError('Bitte ein gültiges Ende eintragen.')
      return
    }

    startTransition(async () => {
      if (event) {
        const result = await updateEventAction(event.id, {
          startedAt: startIso,
          endedAt: endIso,
          payload,
          note: note.trim() || null,
        })
        if ('error' in result) {
          setError(result.error)
          return
        }
      } else {
        const result = await createEventAction({
          childId,
          type,
          startedAt: startIso,
          endedAt: endIso,
          payload,
          note: note.trim() || undefined,
        })
        if ('error' in result) {
          setError(result.error)
          return
        }
        // Hat die andere Person kurz davor dasselbe eingetragen? Nur beim
        // Anlegen – ein bearbeiteter Eintrag ist keine Doppelerfassung.
        if (result.duplikat) meldeDuplikat(result.duplikat)
      }
      router.refresh()

      // Abgepumpte Milch landet meistens im Vorrat – deshalb steht das Angebot
      // direkt an der Bestätigung und nicht zwei Bildschirme weiter.
      const abgepumpt = !event && type === 'pumping' ? abgepumpteMenge(payload) : 0
      if (abgepumpt > 0) {
        toast({
          title: `${category.label} eingetragen`,
          description: `${abgepumpt} ml – in den Vorrat legen?`,
          action: {
            label: 'Einlagern',
            onClick: async () => {
              const gespeichert = await savePortionAction({
                childId,
                abgepumptAm: startIso,
                mengeMl: abgepumpt,
                lagerort: 'kuehlschrank',
              })
              toast(
                'error' in gespeichert
                  ? { title: 'Nicht eingelagert', description: gespeichert.error, variant: 'destructive' }
                  : { title: `${abgepumpt} ml im Kühlschrank` },
              )
              router.refresh()
            },
          },
        })
      } else {
        toast({ title: event ? 'Gespeichert' : `${category.label} eingetragen` })
      }
      onOpenChange(false)
    })
  }

  function remove() {
    if (!event) return
    const id = event.id
    startTransition(async () => {
      const result = await deleteEventAction(id)
      if ('error' in result) {
        toast({ title: 'Nicht gelöscht', description: result.error, variant: 'destructive' })
        return
      }
      router.refresh()
      toast({
        title: 'Gelöscht',
        action: {
          label: 'Rückgängig',
          onClick: async () => {
            await restoreEventAction(id)
            router.refresh()
          },
        },
      })
      onOpenChange(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {event ? `${category.label} bearbeiten` : `${category.label} eintragen`}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <PayloadFields
            type={type}
            payload={payload}
            onChange={setPayload}
            suggestions={suggestions}
            lastNursingSide={lastNursingSide}
          />

          <div className="flex flex-col gap-3 rounded-xl bg-muted p-3">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
              <Clock className="size-4" aria-hidden />
              Zeit
            </p>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="startedAt">{category.timed ? 'Beginn' : 'Zeitpunkt'}</Label>
              <Input
                id="startedAt"
                type="datetime-local"
                value={startedAt}
                onChange={(e) => setStartedAt(e.target.value)}
                required
              />
            </div>
            {category.timed && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="endedAt">Ende</Label>
                <Input
                  id="endedAt"
                  type="datetime-local"
                  value={endedAt}
                  onChange={(e) => setEndedAt(e.target.value)}
                />
                {durationHint && (
                  <p className="text-xs text-muted-foreground">Dauer: {durationHint}</p>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="note">Notiz</Label>
            <Textarea
              id="note"
              rows={2}
              maxLength={2000}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {error && (
            <p role="alert" data-testid="form-error" className="text-sm font-medium text-destructive">
              {error}
            </p>
          )}

          <div className="flex gap-2">
            {event && (
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={remove}
                disabled={pending}
                aria-label="Eintrag löschen"
                className="shrink-0 px-4 text-destructive"
              >
                <Trash2 aria-hidden />
              </Button>
            )}
            <Button type="button" size="lg" className="flex-1" onClick={save} disabled={pending}>
              {pending ? 'Speichert …' : 'Speichern'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
