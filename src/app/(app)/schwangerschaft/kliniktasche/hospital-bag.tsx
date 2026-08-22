'use client'
import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2 } from 'lucide-react'
import {
  addChecklistItemAction,
  deleteChecklistItemAction,
  toggleChecklistItemAction,
} from '@/lib/actions/pregnancy-tracking'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { UserAvatar } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'
import { groupBy } from '@/lib/utils'
import { cn } from '@/lib/utils'

type Member = { id: string; displayName: string; initials: string; color: string }
type Item = {
  id: string
  section: string
  label: string
  note: string | null
  quantity: string | null
  done: boolean
  custom: boolean
  doneBy: Member | null
}

export function HospitalBag({ items, sections }: { items: Item[]; sections: string[] }) {
  const [adding, setAdding] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const { toast } = useToast()
  const router = useRouter()

  const grouped = useMemo(() => groupBy(items, (item) => item.section), [items])
  const doneCount = items.filter((i) => i.done).length
  const percent = items.length === 0 ? 0 : Math.round((doneCount / items.length) * 100)

  function toggle(item: Item) {
    startTransition(async () => {
      const result = await toggleChecklistItemAction(item.id, !item.done)
      if ('error' in result) {
        toast({ title: 'Nicht gespeichert', description: result.error, variant: 'destructive' })
      }
      router.refresh()
    })
  }

  function remove(item: Item) {
    startTransition(async () => {
      const result = await deleteChecklistItemAction(item.id)
      if ('error' in result) {
        toast({ title: 'Nicht gelöscht', description: result.error, variant: 'destructive' })
      } else {
        toast({ title: `„${item.label}“ entfernt` })
      }
      router.refresh()
    })
  }

  // Zusaetzliche Abschnitte, die per Freitext angelegt wurden.
  const allSections = useMemo(() => {
    const extra = [...grouped.keys()].filter((s) => !sections.includes(s))
    return [...sections, ...extra]
  }, [grouped, sections])

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex flex-col gap-2 pt-5">
          <div className="flex items-baseline justify-between">
            <span className="font-display text-2xl font-bold tabular">
              {doneCount} / {items.length}
            </span>
            <span className="text-sm text-muted-foreground">{percent} % gepackt</span>
          </div>
          <Progress value={percent} aria-label={`${percent} Prozent gepackt`} />
        </CardContent>
      </Card>

      {allSections.map((section) => {
        const sectionItems = grouped.get(section) ?? []
        if (sectionItems.length === 0) return null
        const sectionDone = sectionItems.filter((i) => i.done).length
        return (
          <section key={section}>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                {section}
              </h2>
              <span className="tabular text-xs text-muted-foreground">
                {sectionDone}/{sectionItems.length}
              </span>
            </div>
            <ul className="overflow-hidden rounded-xl border border-border bg-card">
              {sectionItems.map((item) => (
                <li key={item.id} className="flex items-start gap-3 border-b border-border p-3 last:border-b-0">
                  <Checkbox
                    checked={item.done}
                    onCheckedChange={() => toggle(item)}
                    disabled={pending}
                    aria-label={`${item.label} abhaken`}
                    className="mt-0.5"
                  />
                  <div className="min-w-0 flex-1">
                    <p className={cn('font-semibold', item.done && 'text-muted-foreground line-through')}>
                      {item.label}
                      {item.quantity && (
                        <span className="ml-2 text-sm font-normal text-muted-foreground">
                          {item.quantity}
                        </span>
                      )}
                    </p>
                    {item.note && <p className="text-sm text-muted-foreground">{item.note}</p>}
                  </div>
                  {item.done && item.doneBy && (
                    <UserAvatar
                      size="sm"
                      initials={item.doneBy.initials}
                      color={item.doneBy.color}
                      title={`Abgehakt von ${item.doneBy.displayName}`}
                    />
                  )}
                  {item.custom && (
                    <button
                      type="button"
                      onClick={() => remove(item)}
                      disabled={pending}
                      aria-label={`${item.label} löschen`}
                      className="flex size-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-destructive"
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  )}
                </li>
              ))}
            </ul>
            <Button
              variant="ghost"
              size="sm"
              className="mt-1 w-full justify-start"
              onClick={() => setAdding(section)}
            >
              <Plus aria-hidden />
              Etwas zu „{section}“ hinzufügen
            </Button>
          </section>
        )
      })}

      <AddItemDialog
        sections={allSections}
        defaultSection={adding}
        open={adding !== null}
        onOpenChange={(next) => !next && setAdding(null)}
      />
    </div>
  )
}

function AddItemDialog({
  sections,
  defaultSection,
  open,
  onOpenChange,
}: {
  sections: string[]
  defaultSection: string | null
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
      const result = await addChecklistItemAction({
        section: String(formData.get('section') ?? ''),
        label: String(formData.get('label') ?? ''),
        note: String(formData.get('note') ?? ''),
        quantity: String(formData.get('quantity') ?? ''),
      })
      if ('error' in result) {
        setError(result.error)
        return
      }
      toast({ title: 'Hinzugefügt' })
      onOpenChange(false)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Etwas hinzufügen</DialogTitle>
        </DialogHeader>
        <form action={submit} className="flex flex-col gap-4" key={defaultSection ?? 'none'}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="label">Was?</Label>
            <Input id="label" name="label" required maxLength={120} autoFocus />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="section">Abschnitt</Label>
            <Select name="section" defaultValue={defaultSection ?? sections[0]}>
              <SelectTrigger id="section">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sections.map((section) => (
                  <SelectItem key={section} value={section}>
                    {section}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="quantity">Menge</Label>
            <Input id="quantity" name="quantity" maxLength={40} placeholder="z. B. 2 Paar" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="note">Notiz</Label>
            <Input id="note" name="note" maxLength={300} />
          </div>
          {error && <p className="text-sm font-medium text-destructive">{error}</p>}
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? 'Speichert …' : 'Hinzufügen'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
