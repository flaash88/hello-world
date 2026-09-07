'use client'
import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarPlus, MapPin, Pencil, Trash2 } from 'lucide-react'
import {
  deleteAppointmentAction,
  saveAppointmentAction,
  toggleAppointmentDoneAction,
} from '@/lib/actions/pregnancy-tracking'
import { formatDateShort, formatDateTime } from '@/lib/time'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

type Appointment = {
  id: string
  title: string
  category: string
  scheduledAt: string | null
  windowFrom: string | null
  windowTo: string | null
  weekRange: string | null
  location: string | null
  note: string | null
  done: boolean
  templateKey: string | null
}

const CATEGORY_LABEL: Record<string, string> = {
  ekp: 'Eltern-Kind-Pass',
  doctor: 'Ärztin',
  midwife: 'Hebamme',
  course: 'Kurs',
  other: 'Sonstiges',
}

export function AppointmentList({
  appointments,
  currentWeek,
}: {
  appointments: Appointment[]
  currentWeek: number
}) {
  const [editing, setEditing] = useState<Appointment | 'new' | null>(null)
  const [pending, startTransition] = useTransition()
  const { toast } = useToast()
  const router = useRouter()

  const { open, done } = useMemo(
    () => ({
      open: appointments.filter((a) => !a.done),
      done: appointments.filter((a) => a.done),
    }),
    [appointments],
  )

  function toggle(appointment: Appointment) {
    startTransition(async () => {
      const result = await toggleAppointmentDoneAction(appointment.id, !appointment.done)
      if ('error' in result) {
        toast({ title: 'Nicht gespeichert', description: result.error, variant: 'destructive' })
      } else if (!appointment.done) {
        toast({
          title: 'Erledigt',
          action: {
            label: 'Rückgängig',
            onClick: async () => {
              await toggleAppointmentDoneAction(appointment.id, false)
              router.refresh()
            },
          },
        })
      }
      router.refresh()
    })
  }

  function remove(id: string) {
    startTransition(async () => {
      const result = await deleteAppointmentAction(id)
      if ('error' in result) {
        toast({ title: 'Nicht gelöscht', description: result.error, variant: 'destructive' })
      } else {
        toast({ title: 'Termin gelöscht' })
      }
      router.refresh()
    })
  }

  function renderRow(appointment: Appointment) {
    const range = appointment.weekRange
    const soon =
      !appointment.done &&
      appointment.windowFrom !== null &&
      appointment.windowTo !== null &&
      new Date(appointment.windowFrom).getTime() <= Date.now() &&
      new Date(appointment.windowTo).getTime() >= Date.now()
    const overdue =
      !appointment.done &&
      appointment.windowTo !== null &&
      new Date(appointment.windowTo).getTime() < Date.now()

    return (
      <li key={appointment.id}>
        <Card className={cn(soon && 'border-primary', appointment.done && 'opacity-60')}>
          <CardContent className="flex items-start gap-3 p-4">
            <Checkbox
              checked={appointment.done}
              onCheckedChange={() => toggle(appointment)}
              disabled={pending}
              aria-label={`${appointment.title} als erledigt markieren`}
              className="mt-0.5"
            />
            <div className="min-w-0 flex-1">
              <p className={cn('font-semibold', appointment.done && 'line-through')}>
                {appointment.title}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                {range && <Badge variant={soon ? 'default' : 'muted'}>{range}</Badge>}
                {overdue && <Badge variant="outline">Zeitfenster vorbei</Badge>}
                {appointment.category !== 'ekp' && (
                  <Badge variant="outline">{CATEGORY_LABEL[appointment.category] ?? 'Termin'}</Badge>
                )}
              </div>
              {appointment.scheduledAt && (
                <p className="mt-1 text-sm font-semibold text-primary">
                  {formatDateTime(new Date(appointment.scheduledAt))}
                </p>
              )}
              {appointment.location && (
                <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="size-3.5" aria-hidden />
                  {appointment.location}
                </p>
              )}
              {appointment.note && (
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{appointment.note}</p>
              )}
            </div>
            <div className="flex shrink-0 flex-col">
              <button
                type="button"
                onClick={() => setEditing(appointment)}
                aria-label={`${appointment.title} bearbeiten`}
                className="flex size-12 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent"
              >
                <Pencil className="size-4" aria-hidden />
              </button>
              {!appointment.templateKey && (
                <button
                  type="button"
                  onClick={() => remove(appointment.id)}
                  disabled={pending}
                  aria-label={`${appointment.title} löschen`}
                  className="flex size-12 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-destructive"
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      </li>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <Button size="lg" onClick={() => setEditing('new')}>
        <CalendarPlus aria-hidden />
        Eigenen Termin anlegen
      </Button>

      <section>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
          Offen ({open.length})
        </h2>
        <ul className="flex flex-col gap-2">{open.map(renderRow)}</ul>
      </section>

      {done.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
            Erledigt ({done.length})
          </h2>
          <ul className="flex flex-col gap-2">{done.map(renderRow)}</ul>
        </section>
      )}

      <p className="text-xs text-muted-foreground">
        Aktuell: SSW {currentWeek}. Die Zeitfenster folgen dem üblichen Schema – verbindlich ist
        immer, was im Eltern-Kind-Pass steht.
      </p>

      <AppointmentDialog
        appointment={editing === 'new' ? null : editing}
        open={editing !== null}
        onOpenChange={(next) => !next && setEditing(null)}
      />
    </div>
  )
}

function AppointmentDialog({
  appointment,
  open,
  onOpenChange,
}: {
  appointment: Appointment | null
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
      const result = await saveAppointmentAction({
        id: appointment?.id,
        title: String(formData.get('title') ?? ''),
        category: (formData.get('category') as 'ekp' | 'doctor' | 'midwife' | 'course' | 'other') ?? 'other',
        scheduledAt: String(formData.get('scheduledAt') ?? '') || undefined,
        location: String(formData.get('location') ?? ''),
        note: String(formData.get('note') ?? ''),
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
          <DialogTitle>{appointment ? 'Termin bearbeiten' : 'Neuer Termin'}</DialogTitle>
        </DialogHeader>
        <form action={submit} className="flex flex-col gap-4" key={appointment?.id ?? 'new'}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">Titel</Label>
            <Input id="title" name="title" required maxLength={120} defaultValue={appointment?.title ?? ''} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="category">Art</Label>
            <Select name="category" defaultValue={appointment?.category ?? 'other'}>
              <SelectTrigger id="category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CATEGORY_LABEL).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="scheduledAt">Konkreter Termin</Label>
            <Input
              id="scheduledAt"
              name="scheduledAt"
              type="datetime-local"
              defaultValue={appointment?.scheduledAt ? toLocalInput(appointment.scheduledAt) : ''}
            />
            {appointment?.windowFrom && appointment.windowTo && (
              <p className="text-xs text-muted-foreground">
                Übliches Fenster: {formatDateShort(new Date(appointment.windowFrom))} bis{' '}
                {formatDateShort(new Date(appointment.windowTo))}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="location">Ort</Label>
            <Input id="location" name="location" maxLength={160} defaultValue={appointment?.location ?? ''} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="note">Notiz</Label>
            <Textarea id="note" name="note" rows={3} defaultValue={appointment?.note ?? ''} />
          </div>
          {error && <p className="text-sm font-medium text-destructive">{error}</p>}
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? 'Speichert …' : 'Speichern'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function toLocalInput(iso: string): string {
  const date = new Date(iso)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}
