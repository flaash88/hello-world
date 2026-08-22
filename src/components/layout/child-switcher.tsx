'use client'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { ChevronDown } from 'lucide-react'
import type { Child } from '@prisma/client'
import { setActiveChildAction } from '@/lib/actions/children'
import { formatAge } from '@/lib/time'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * Ein Kind ist aktiv; das Datenmodell traegt mehrere. Bei genau einem Kind
 * zeigen wir nur den Namen ohne Umschalter – kein Klick ins Leere.
 */
export function ChildSwitcher({
  childList,
  activeChildId,
}: {
  childList: Child[]
  activeChildId: string | null
}) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  const active = childList.find((c) => c.id === activeChildId) ?? null

  function select(id: string) {
    startTransition(async () => {
      await setActiveChildAction(id)
      setOpen(false)
      router.refresh()
    })
  }

  if (childList.length === 0) {
    return <span className="truncate font-display text-base font-semibold">Sprössling</span>
  }
  if (childList.length === 1) {
    return (
      <span className="block truncate font-display text-base font-semibold">
        {active?.name}
        {active?.birthDate && (
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            {formatAge(active.birthDate)}
          </span>
        )}
      </span>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="flex min-h-12 items-center gap-1 truncate font-display text-base font-semibold">
        {active?.name ?? 'Kind wählen'}
        <ChevronDown className="size-4 shrink-0 opacity-60" aria-hidden />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Kind wählen</DialogTitle>
        </DialogHeader>
        <ul className="flex flex-col gap-2">
          {childList.map((child) => (
            <li key={child.id}>
              <button
                type="button"
                disabled={pending}
                onClick={() => select(child.id)}
                className={cn(
                  'flex min-h-14 w-full items-center justify-between rounded-xl border-2 px-4 text-left',
                  child.id === activeChildId ? 'border-primary bg-primary/5' : 'border-border',
                )}
              >
                <span className="font-semibold">{child.name}</span>
                {child.birthDate && (
                  <span className="text-sm text-muted-foreground">{formatAge(child.birthDate)}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
