'use client'
import { useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Flag, Pencil, Plus, Trash2 } from 'lucide-react'
import type { MilestoneTemplate } from '@/lib/content/milestones'
import { MILESTONE_CATEGORIES, MILESTONE_CATEGORY_LABEL } from '@/lib/content/milestones'
import {
  deleteMilestoneAction,
  saveMilestoneAction,
  toggleMilestoneAction,
} from '@/lib/actions/development'
import { formatDateShort } from '@/lib/time'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'
import { PhotoUpload, type UploadedPhoto } from '@/components/journal/photo-upload'
import { cn, groupBy } from '@/lib/utils'

type SavedMilestone = {
  id: string
  key: string | null
  title: string
  category: string
  achievedAt: string | null
  note: string | null
  photo: UploadedPhoto | null
}

export function MilestoneList({
  childId,
  currentWeek,
  templates,
  saved,
}: {
  childId: string
  currentWeek: number
  templates: MilestoneTemplate[]
  saved: SavedMilestone[]
}) {
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<SavedMilestone | null>(null)
  const [pending, startTransition] = useTransition()
  const { toast } = useToast()
  const router = useRouter()

  const savedByKey = useMemo(
    () => new Map(saved.filter((m) => m.key).map((m) => [m.key!, m])),
    [saved],
  )
  const ownMilestones = useMemo(() => saved.filter((m) => !m.key), [saved])
  const achievedCount = saved.filter((m) => m.achievedAt).length

  const byCategory = useMemo(() => groupBy(templates, (t) => t.category), [templates])

  function toggle(template: MilestoneTemplate, achieved: boolean) {
    startTransition(async () => {
      const result = await toggleMilestoneAction(childId, template.key, achieved)
      if ('error' in result) {
        toast({ title: 'Nicht gespeichert', description: result.error, variant: 'destructive' })
      } else if (achieved) {
        toast({
          title: `„${template.title}“ geschafft`,
          action: {
            label: 'Rückgängig',
            onClick: async () => {
              await toggleMilestoneAction(childId, template.key, false)
              router.refresh()
            },
          },
        })
      }
      router.refresh()
    })
  }

  function removeOwn(id: string) {
    startTransition(async () => {
      const result = await deleteMilestoneAction(id)
      if ('error' in result) {
        toast({ title: 'Nicht gelöscht', description: result.error, variant: 'destructive' })
      }
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground">
        {achievedCount} von {templates.length} abgehakt · Lebenswoche {currentWeek}
      </p>

      <Button size="lg" onClick={() => setAdding(true)}>
        <Plus aria-hidden />
        Eigenen Meilenstein anlegen
      </Button>

      <Tabs defaultValue="offen">
        <TabsList className="w-full">
          <TabsTrigger value="offen">Offen</TabsTrigger>
          <TabsTrigger value="geschafft">Geschafft</TabsTrigger>
          <TabsTrigger value="alle">Alle</TabsTrigger>
        </TabsList>

        <TabsContent value="offen">
          {renderGroups((template) => !savedByKey.get(template.key)?.achievedAt)}
        </TabsContent>
        <TabsContent value="geschafft">
          {renderGroups((template) => Boolean(savedByKey.get(template.key)?.achievedAt))}
        </TabsContent>
        <TabsContent value="alle">{renderGroups(() => true)}</TabsContent>
      </Tabs>

      {ownMilestones.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
            Eigene Meilensteine
          </h2>
          <ul className="flex flex-col gap-2">
            {ownMilestones.map((milestone) => (
              <li key={milestone.id}>
                <Card>
                  <CardContent className="flex items-start gap-3 p-4">
                    <Flag className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{milestone.title}</p>
                      {milestone.achievedAt && (
                        <p className="text-sm text-muted-foreground">
                          {formatDateShort(new Date(milestone.achievedAt))}
                        </p>
                      )}
                      {milestone.note && <p className="mt-1 text-sm">{milestone.note}</p>}
                      {milestone.photo && (
                        <Image
                          src={`/api/uploads/${milestone.photo.thumbPath}`}
                          alt=""
                          width={160}
                          height={160}
                          unoptimized
                          className="mt-2 aspect-square w-24 rounded-lg object-cover"
                        />
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditing(milestone)}
                      aria-label={`${milestone.title} bearbeiten`}
                      className="flex size-12 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent"
                    >
                      <Pencil className="size-4" aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeOwn(milestone.id)}
                      disabled={pending}
                      aria-label={`${milestone.title} löschen`}
                      className="flex size-12 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-destructive"
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}

      <MilestoneDialog childId={childId} open={adding} onOpenChange={setAdding} />
      <MilestoneDetailsDialog
        childId={childId}
        milestone={editing}
        onClose={() => setEditing(null)}
      />
    </div>
  )

  function renderGroups(filter: (template: MilestoneTemplate) => boolean) {
    const groups = [...byCategory.entries()]
      .map(([category, list]) => ({ category, list: list.filter(filter) }))
      .filter((group) => group.list.length > 0)

    if (groups.length === 0) {
      return <p className="py-6 text-center text-sm text-muted-foreground">Hier ist gerade nichts.</p>
    }

    return (
      <div className="flex flex-col gap-4">
        {groups.map(({ category, list }) => (
          <section key={category}>
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
              {MILESTONE_CATEGORY_LABEL[category as (typeof MILESTONE_CATEGORIES)[number]] ?? category}
            </h2>
            <ul className="overflow-hidden rounded-xl border border-border bg-card">
              {list.map((template) => {
                const entry = savedByKey.get(template.key)
                const achieved = Boolean(entry?.achievedAt)
                const inWindow = currentWeek >= template.fromWeeks && currentWeek <= template.toWeeks
                const overdue =
                  !achieved &&
                  template.concernAfterWeeks !== undefined &&
                  currentWeek > template.concernAfterWeeks

                return (
                  <li key={template.key} className="flex items-start gap-3 border-b border-border p-3 last:border-b-0">
                    <Checkbox
                      checked={achieved}
                      onCheckedChange={(checked) => toggle(template, checked === true)}
                      disabled={pending}
                      aria-label={`${template.title} abhaken`}
                      className="mt-0.5"
                    />
                    <div className="min-w-0 flex-1">
                      <p className={cn('font-semibold', achieved && 'text-muted-foreground line-through')}>
                        {template.title}
                      </p>
                      <p className="text-sm text-muted-foreground">{template.description}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <Badge variant="outline">
                          Woche {template.fromWeeks}–{template.toWeeks}
                        </Badge>
                        {inWindow && !achieved && <Badge>Im Zeitfenster</Badge>}
                        {overdue && <Badge variant="destructive">Beim Termin ansprechen</Badge>}
                        {achieved && entry?.achievedAt && (
                          <Badge variant="secondary">
                            {formatDateShort(new Date(entry.achievedAt))}
                          </Badge>
                        )}
                      </div>
                      {entry?.note && <p className="mt-1 text-sm">{entry.note}</p>}
                      {entry?.photo && (
                        <Image
                          src={`/api/uploads/${entry.photo.thumbPath}`}
                          alt=""
                          width={160}
                          height={160}
                          unoptimized
                          className="mt-2 aspect-square w-24 rounded-lg object-cover"
                        />
                      )}
                    </div>
                    {achieved && entry && (
                      <button
                        type="button"
                        onClick={() => setEditing(entry)}
                        aria-label={`${template.title} bearbeiten`}
                        className="flex size-12 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent"
                      >
                        <Pencil className="size-4" aria-hidden />
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>
    )
  }
}

function MilestoneDialog({
  childId,
  open,
  onOpenChange,
}: {
  childId: string
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
      const result = await saveMilestoneAction({
        childId,
        title: String(formData.get('title') ?? ''),
        category: String(formData.get('category') ?? 'erstes'),
        achievedAt: String(formData.get('achievedAt') ?? '') || null,
        note: String(formData.get('note') ?? ''),
      })
      if ('error' in result) {
        setError(result.error)
        return
      }
      toast({ title: 'Meilenstein gespeichert' })
      onOpenChange(false)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Eigener Meilenstein</DialogTitle>
        </DialogHeader>
        <form action={submit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">Was war es?</Label>
            <Input id="title" name="title" required maxLength={120} autoFocus />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="category">Bereich</Label>
            <Select name="category" defaultValue="erstes">
              <SelectTrigger id="category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MILESTONE_CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category}>
                    {MILESTONE_CATEGORY_LABEL[category]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="achievedAt">Wann?</Label>
            <Input
              id="achievedAt"
              name="achievedAt"
              type="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="note">Notiz</Label>
            <Textarea id="note" name="note" rows={3} maxLength={1000} />
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

/**
 * Datum, Notiz und Foto zu einem abgehakten Meilenstein. Erst hier – das
 * Abhaken selbst bleibt ein Tap.
 */
function MilestoneDetailsDialog({
  childId,
  milestone,
  onClose,
}: {
  childId: string
  milestone: SavedMilestone | null
  onClose: () => void
}) {
  const [achievedAt, setAchievedAt] = useState('')
  const [note, setNote] = useState('')
  const [photos, setPhotos] = useState<UploadedPhoto[]>([])
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const { toast } = useToast()
  const router = useRouter()

  // Beim Öffnen den gespeicherten Stand übernehmen.
  const openedId = useRef<string | null>(null)
  if (milestone && openedId.current !== milestone.id) {
    openedId.current = milestone.id
    setAchievedAt(milestone.achievedAt ? milestone.achievedAt.slice(0, 10) : '')
    setNote(milestone.note ?? '')
    setPhotos(milestone.photo ? [milestone.photo] : [])
    setError(null)
  }

  function save() {
    if (!milestone) return
    setError(null)
    startTransition(async () => {
      const result = await saveMilestoneAction({
        id: milestone.id,
        childId,
        key: milestone.key,
        title: milestone.title,
        category: milestone.category,
        achievedAt: achievedAt || null,
        note,
        mediaId: photos[0]?.id ?? null,
      })
      if ('error' in result) {
        setError(result.error)
        return
      }
      toast({ title: 'Gespeichert' })
      openedId.current = null
      onClose()
      router.refresh()
    })
  }

  return (
    <Dialog open={Boolean(milestone)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{milestone?.title}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="detailsDate">Wann war das?</Label>
            <Input
              id="detailsDate"
              type="date"
              value={achievedAt}
              onChange={(event) => setAchievedAt(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="detailsNote">Notiz</Label>
            <Textarea
              id="detailsNote"
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
            label="Foto hinzufügen"
          />
          {error && (
            <p data-testid="form-error" className="text-sm font-medium text-destructive">
              {error}
            </p>
          )}
          <Button onClick={save} disabled={pending}>
            {pending ? 'Speichert …' : 'Speichern'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
