'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Bed, HeartHandshake, Lock, Moon, Phone, Plus, Trash2 } from 'lucide-react'
import {
  deleteParentJournalAction,
  saveNightShiftAction,
  saveParentCheckinAction,
  saveParentJournalAction,
} from '@/lib/actions/parents'
import { SUPPORT_CONTACTS, type ParentDay, type SupportSignal } from '@/lib/parents/support'
import { formatDateShort, formatDateTime } from '@/lib/time'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { UserAvatar } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { NumberStepper } from '@/components/tracker/number-stepper'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

type Member = { id: string; displayName: string; initials: string; color: string }

const MOOD_LABEL = ['sehr schwer', 'schwer', 'geht so', 'gut', 'sehr gut']
const ENERGY_LABEL = ['völlig leer', 'wenig', 'mittel', 'gut', 'voll da']
const STRESS_LABEL = ['entspannt', 'wenig', 'mittel', 'hoch', 'sehr hoch']

export function ParentsView({
  userId,
  userName,
  members,
  todayKey,
  today,
  days,
  childWakes,
  signal,
  journal,
  shift,
  recentShifts,
}: {
  userId: string
  userName: string
  members: Member[]
  todayKey: string
  today: {
    mood: number | null
    energy: number | null
    stress: number | null
    note: string | null
    sleepHours: number | null
    sleepQuality: number | null
    wakeCount: number | null
  }
  days: ParentDay[]
  childWakes: number[]
  signal: SupportSignal
  journal: { id: string; body: string; mood: number | null; createdAt: string }[]
  shift: { userId: string | null; handoverNote: string | null }
  recentShifts: { date: string; userId: string | null; handoverNote: string | null }[]
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold">Wir</h1>
        <p className="text-muted-foreground">
          Für {userName}. Alles hier dreht sich um euch, nicht um das Kind.
        </p>
      </div>

      <CheckinCard todayKey={todayKey} today={today} />

      {signal.show && signal.reason && <SupportCard reason={signal.reason} />}

      <Tabs defaultValue="verlauf">
        <TabsList className="w-full">
          <TabsTrigger value="verlauf">Verlauf</TabsTrigger>
          <TabsTrigger value="nacht">Nachtschicht</TabsTrigger>
          <TabsTrigger value="journal">Privat</TabsTrigger>
        </TabsList>

        <TabsContent value="verlauf">
          <HistoryCard days={days} childWakes={childWakes} />
        </TabsContent>
        <TabsContent value="nacht">
          <NightShiftCard
            userId={userId}
            members={members}
            todayKey={todayKey}
            shift={shift}
            recent={recentShifts}
          />
        </TabsContent>
        <TabsContent value="journal">
          <PrivateJournal entries={journal} />
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Phone className="size-4 text-muted-foreground" aria-hidden />
            Wenn ihr Unterstützung braucht
          </CardTitle>
          <CardDescription>
            Kostenlos, vertraulich und ohne Anlass, den man begründen müsste.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ContactList />
        </CardContent>
      </Card>
    </div>
  )
}

function CheckinCard({
  todayKey,
  today,
}: {
  todayKey: string
  today: {
    mood: number | null
    energy: number | null
    stress: number | null
    note: string | null
    sleepHours: number | null
    sleepQuality: number | null
    wakeCount: number | null
  }
}) {
  const [mood, setMood] = useState(today.mood ?? 3)
  const [energy, setEnergy] = useState(today.energy ?? 3)
  const [stress, setStress] = useState(today.stress ?? 3)
  const [sleepHours, setSleepHours] = useState<number | null>(today.sleepHours)
  const [sleepQuality, setSleepQuality] = useState(today.sleepQuality ?? 3)
  const [wakeCount, setWakeCount] = useState<number | null>(today.wakeCount)
  const [showSleep, setShowSleep] = useState(today.sleepHours !== null)
  const [pending, startTransition] = useTransition()
  const { toast } = useToast()
  const router = useRouter()

  const saved = today.mood !== null

  function save(note?: string) {
    startTransition(async () => {
      const result = await saveParentCheckinAction({
        date: todayKey,
        mood,
        energy,
        stress,
        note,
        sleepHours: showSleep ? sleepHours : null,
        sleepQuality: showSleep ? sleepQuality : null,
        wakeCount: showSleep ? wakeCount : null,
      })
      if ('error' in result) {
        toast({ title: 'Nicht gespeichert', description: result.error, variant: 'destructive' })
      } else {
        toast({ title: saved ? 'Aktualisiert' : 'Danke – das war’s schon' })
      }
      router.refresh()
    })
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <HeartHandshake className="size-4 text-primary" aria-hidden />
          Wie geht es dir heute?
        </CardTitle>
        <CardDescription>
          {saved ? 'Heute schon eingetragen – änderbar, solange der Tag läuft.' : 'Zehn Sekunden, drei Regler.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <SliderRow id="mood" label="Stimmung" labels={MOOD_LABEL} value={mood} onChange={setMood} />
        <SliderRow id="energy" label="Energie" labels={ENERGY_LABEL} value={energy} onChange={setEnergy} />
        <SliderRow id="stress" label="Belastung" labels={STRESS_LABEL} value={stress} onChange={setStress} />

        {showSleep ? (
          <div className="flex flex-col gap-3 rounded-xl bg-muted p-3">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
              <Bed className="size-4" aria-hidden />
              Dein Schlaf letzte Nacht
            </p>
            <NumberStepper
              id="sleepHours"
              label="Stunden"
              step={0.5}
              min={0}
              max={24}
              value={sleepHours}
              onChange={setSleepHours}
            />
            <NumberStepper
              id="wakeCount"
              label="Wie oft wach"
              step={1}
              min={0}
              max={30}
              value={wakeCount}
              onChange={setWakeCount}
            />
            <SliderRow
              id="sleepQuality"
              label="Schlafqualität"
              labels={['sehr schlecht', 'schlecht', 'geht so', 'gut', 'sehr gut']}
              value={sleepQuality}
              onChange={setSleepQuality}
            />
          </div>
        ) : (
          <Button variant="outline" onClick={() => setShowSleep(true)}>
            <Moon aria-hidden />
            Eigenen Schlaf dazu eintragen
          </Button>
        )}

        <Button size="lg" onClick={() => save(today.note ?? undefined)} disabled={pending}>
          {pending ? 'Speichert …' : saved ? 'Aktualisieren' : 'Eintragen'}
        </Button>
      </CardContent>
    </Card>
  )
}

function SliderRow({
  id,
  label,
  labels,
  value,
  onChange,
}: {
  id: string
  label: string
  labels: string[]
  value: number
  onChange: (value: number) => void
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id}>
        {label}: <span className="text-foreground">{labels[value - 1]}</span>
      </Label>
      <Slider
        id={id}
        min={1}
        max={5}
        step={1}
        value={[value]}
        onValueChange={([next]) => onChange(next ?? 3)}
        aria-label={`${label} von 1 bis 5`}
      />
    </div>
  )
}

function SupportCard({ reason }: { reason: string }) {
  return (
    <Card className="border-primary/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Ein kurzer Gedanke</CardTitle>
        <CardDescription>{reason}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm leading-relaxed">
          Das erste Jahr ist für viele die anstrengendste Zeit ihres Lebens, und daran ist nichts
          verkehrt. Wenn du magst, red mit jemandem darüber – mit deiner Hebamme, mit einer der
          Stellen unten oder mit der Person, mit der du das hier machst.
        </p>
        <p className="text-xs text-muted-foreground">
          Sprössling stellt keine Diagnose und kann keine stellen. Das hier ist nur ein Hinweis auf
          das, was du selbst eingetragen hast.
        </p>
        <ContactList compact />
      </CardContent>
    </Card>
  )
}

function ContactList({ compact = false }: { compact?: boolean }) {
  return (
    <ul className="flex flex-col gap-2">
      {SUPPORT_CONTACTS.map((contact) => (
        <li key={contact.name} className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-semibold">
              {contact.name}
              {contact.aroundTheClock && (
                <Badge variant="secondary" className="ml-2">
                  rund um die Uhr
                </Badge>
              )}
            </p>
            {!compact && <p className="text-sm text-muted-foreground">{contact.description}</p>}
          </div>
          {contact.phone && (
            <a
              href={`tel:${contact.phone}`}
              className="flex min-h-12 shrink-0 items-center gap-1.5 rounded-lg border-2 border-border px-3 font-semibold"
            >
              <Phone className="size-4" aria-hidden />
              {contact.phone}
            </a>
          )}
          {!contact.phone && contact.url && (
            <a
              href={contact.url}
              target="_blank"
              rel="noreferrer noopener"
              className="flex min-h-12 shrink-0 items-center rounded-lg border-2 border-border px-3 text-sm font-semibold"
            >
              Website
            </a>
          )}
        </li>
      ))}
    </ul>
  )
}

function HistoryCard({ days, childWakes }: { days: ParentDay[]; childWakes: number[] }) {
  const withData = days.filter((day) => day.mood !== null || day.sleepHours !== null)

  if (withData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Noch kein Verlauf</CardTitle>
          <CardDescription>
            Ab dem zweiten Check-in siehst du hier, wie sich die Tage entwickeln.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Die letzten zwei Wochen</CardTitle>
        <CardDescription>Dein Schlaf im Vergleich zu den Nachtwachen des Kindes</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-2">
          {days.map((day, index) => {
            const wakes = childWakes[index] ?? 0
            const hasData = day.mood !== null || day.sleepHours !== null
            return (
              <li key={day.date} className="flex items-center gap-3">
                <span className="w-14 shrink-0 text-xs text-muted-foreground">
                  {formatDateShort(new Date(`${day.date}T12:00:00Z`))}
                </span>
                <div className="flex flex-1 items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <span
                      key={level}
                      aria-hidden
                      className={cn(
                        'h-3 flex-1 rounded-full',
                        day.mood !== null && day.mood >= level ? 'bg-primary' : 'bg-muted',
                      )}
                    />
                  ))}
                </div>
                <span className="tabular w-24 shrink-0 text-right text-xs text-muted-foreground">
                  {hasData
                    ? `${day.sleepHours !== null ? `${day.sleepHours} h` : '– h'}${wakes > 0 ? ` · ${wakes}× wach` : ''}`
                    : 'nichts erfasst'}
                </span>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}

function NightShiftCard({
  userId,
  members,
  todayKey,
  shift,
  recent,
}: {
  userId: string
  members: Member[]
  todayKey: string
  shift: { userId: string | null; handoverNote: string | null }
  recent: { date: string; userId: string | null; handoverNote: string | null }[]
}) {
  const [selected, setSelected] = useState<string | null>(shift.userId)
  const [note, setNote] = useState(shift.handoverNote ?? '')
  const [pending, startTransition] = useTransition()
  const { toast } = useToast()
  const router = useRouter()

  function save() {
    startTransition(async () => {
      const result = await saveNightShiftAction({ date: todayKey, userId: selected, handoverNote: note })
      if ('error' in result) {
        toast({ title: 'Nicht gespeichert', description: result.error, variant: 'destructive' })
      } else {
        toast({ title: 'Nachtschicht eingetragen' })
      }
      router.refresh()
    })
  }

  const memberById = new Map(members.map((member) => [member.id, member]))

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Moon className="size-4 text-primary" aria-hidden />
            Wer übernimmt heute Nacht?
          </CardTitle>
          <CardDescription>Beide sehen den Eintrag – das erspart die Diskussion um 23 Uhr.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            {members.map((member) => (
              <button
                key={member.id}
                type="button"
                aria-pressed={selected === member.id}
                onClick={() => setSelected(selected === member.id ? null : member.id)}
                className={cn(
                  'flex min-h-14 items-center gap-2 rounded-xl border-2 px-3 font-semibold',
                  selected === member.id ? 'border-primary bg-primary/10' : 'border-border',
                )}
              >
                <UserAvatar initials={member.initials} color={member.color} size="sm" />
                <span className="truncate">
                  {member.displayName}
                  {member.id === userId && ' (du)'}
                </span>
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="handover">Übergabe-Notiz</Label>
            <Textarea
              id="handover"
              rows={3}
              maxLength={2000}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="z. B. Fläschchen steht vorbereitet im Kühlschrank, letzte Mahlzeit war um 21:30."
            />
          </div>

          <Button onClick={save} disabled={pending}>
            {pending ? 'Speichert …' : 'Speichern'}
          </Button>
        </CardContent>
      </Card>

      {recent.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Letzte Nächte</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2 text-sm">
              {recent.map((entry) => {
                const member = entry.userId ? memberById.get(entry.userId) : null
                return (
                  <li key={entry.date} className="flex items-center gap-2">
                    <span className="w-16 shrink-0 text-muted-foreground">
                      {formatDateShort(new Date(`${entry.date}T12:00:00Z`))}
                    </span>
                    {member ? (
                      <>
                        <UserAvatar initials={member.initials} color={member.color} size="sm" />
                        <span>{member.displayName}</span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">nicht eingeteilt</span>
                    )}
                  </li>
                )
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function PrivateJournal({
  entries,
}: {
  entries: { id: string; body: string; mood: number | null; createdAt: string }[]
}) {
  const [writing, setWriting] = useState(false)
  const [pending, startTransition] = useTransition()
  const { toast } = useToast()
  const router = useRouter()

  function remove(id: string) {
    startTransition(async () => {
      const result = await deleteParentJournalAction(id)
      if ('error' in result) {
        toast({ title: 'Nicht gelöscht', description: result.error, variant: 'destructive' })
      }
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-2 rounded-xl bg-muted p-3">
        <Lock className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
        <p className="text-sm text-muted-foreground">
          Nur du siehst diese Einträge. Das ist der einzige Bereich der App, den die andere Person
          nicht sehen kann – auch nicht im gemeinsamen Backup.
        </p>
      </div>

      <Button size="lg" onClick={() => setWriting(true)}>
        <Plus aria-hidden />
        Eintrag schreiben
      </Button>

      {entries.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Noch nichts geschrieben. Manchmal reicht ein Satz.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {entries.map((entry) => (
            <li key={entry.id}>
              <Card>
                <CardContent className="flex flex-col gap-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-muted-foreground">
                      {formatDateTime(new Date(entry.createdAt))}
                    </p>
                    <button
                      type="button"
                      onClick={() => remove(entry.id)}
                      disabled={pending}
                      aria-label="Eintrag löschen"
                      className="flex size-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-destructive"
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{entry.body}</p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <PrivateJournalDialog open={writing} onOpenChange={setWriting} />
    </div>
  )
}

function PrivateJournalDialog({
  open,
  onOpenChange,
}: {
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
      const result = await saveParentJournalAction({ body: String(formData.get('body') ?? '') })
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
          <DialogTitle>Nur für dich</DialogTitle>
        </DialogHeader>
        <form action={submit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="body">Was möchtest du festhalten?</Label>
            <Textarea id="body" name="body" rows={8} required autoFocus maxLength={20000} />
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
