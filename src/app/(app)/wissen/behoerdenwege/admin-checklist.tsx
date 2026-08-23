'use client'
import { useOptimistic, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, CalendarClock, Sparkles } from 'lucide-react'
import { ADMIN_PHASES, ADMIN_PHASE_LABEL, type AdminPhase } from '@/lib/content/austria'
import { toggleChecklistItemAction } from '@/lib/actions/pregnancy-tracking'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { UserAvatar } from '@/components/ui/avatar'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

export type AdminItem = {
  id: string
  done: boolean
  doneBy: { name: string; initials: string; color: string } | null
  task: {
    key: string
    phase: AdminPhase
    section: string
    label: string
    deadline: string
    authority: string
    needs: string[]
    note: string | null
    automatic: boolean
  }
}

export function AdminChecklist({ items }: { items: AdminItem[] }) {
  const [pending, startTransition] = useTransition()
  const [optimistic, setOptimistic] = useOptimistic(
    items,
    (state: AdminItem[], update: { id: string; done: boolean }) =>
      state.map((item) => (item.id === update.id ? { ...item, done: update.done } : item)),
  )
  const { toast } = useToast()
  const router = useRouter()

  function toggle(item: AdminItem, done: boolean) {
    startTransition(async () => {
      setOptimistic({ id: item.id, done })
      const result = await toggleChecklistItemAction(item.id, done)
      if ('error' in result) {
        toast({ title: 'Nicht gespeichert', description: result.error, variant: 'destructive' })
      }
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-5">
      {ADMIN_PHASES.map((phase) => {
        const forPhase = optimistic.filter((item) => item.task.phase === phase)
        if (forPhase.length === 0) return null
        const openCount = forPhase.filter((item) => !item.done).length
        const sections: string[] = []
        for (const item of forPhase) {
          if (!sections.includes(item.task.section)) sections.push(item.task.section)
        }

        return (
          <section key={phase}>
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <h2 className="font-display text-lg font-bold">{ADMIN_PHASE_LABEL[phase]}</h2>
              <span className="text-sm text-muted-foreground">
                {openCount === 0 ? 'alles erledigt' : `${openCount} offen`}
              </span>
            </div>

            <div className="flex flex-col gap-3">
              {sections.map((section) => (
                <div key={section}>
                  <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    {section}
                  </h3>
                  <ul className="overflow-hidden rounded-xl border border-border bg-card">
                    {forPhase
                      .filter((item) => item.task.section === section)
                      .map((item) => (
                        <li key={item.id} className="border-b border-border p-3 last:border-b-0">
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={item.done}
                              disabled={pending}
                              onCheckedChange={(checked) => toggle(item, checked === true)}
                              aria-label={`${item.task.label} abhaken`}
                              className="mt-1"
                            />
                            <div className="min-w-0 flex-1">
                              <p
                                className={cn(
                                  'font-semibold',
                                  item.done && 'text-muted-foreground line-through',
                                )}
                              >
                                {item.task.label}
                              </p>

                              <p className="mt-1 flex items-start gap-1.5 text-sm">
                                <CalendarClock
                                  className="mt-0.5 size-4 shrink-0 text-primary"
                                  aria-hidden
                                />
                                <span>{item.task.deadline}</span>
                              </p>

                              <p className="mt-1 flex items-start gap-1.5 text-sm text-muted-foreground">
                                <Building2 className="mt-0.5 size-4 shrink-0" aria-hidden />
                                <span>{item.task.authority}</span>
                              </p>

                              {item.task.automatic && (
                                <Badge variant="secondary" className="mt-1.5 gap-1">
                                  <Sparkles className="size-3" aria-hidden />
                                  passiert automatisch
                                </Badge>
                              )}

                              {item.task.needs.length > 0 && (
                                <p className="mt-1.5 text-sm">
                                  <span className="font-semibold">Mitnehmen: </span>
                                  {item.task.needs.join(', ')}
                                </p>
                              )}

                              {item.task.note && (
                                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                                  {item.task.note}
                                </p>
                              )}

                              {item.done && item.doneBy && (
                                <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <UserAvatar
                                    initials={item.doneBy.initials}
                                    color={item.doneBy.color}
                                    size="sm"
                                  />
                                  erledigt von {item.doneBy.name}
                                </p>
                              )}
                            </div>
                          </div>
                        </li>
                      ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
