'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ChevronDown, Clock, Package } from 'lucide-react'
import type { Exercise } from '@/lib/content/exercises'
import { AREA_LABEL } from '@/lib/content/exercises'
import { logExerciseAction } from '@/lib/actions/development'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

export function ExerciseCard({
  exercise,
  childId,
  done,
  defaultOpen = false,
}: {
  exercise: Exercise
  childId: string
  done: boolean
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const [pending, startTransition] = useTransition()
  const { toast } = useToast()
  const router = useRouter()

  function markDone() {
    startTransition(async () => {
      const result = await logExerciseAction(childId, exercise.id)
      if ('error' in result) {
        toast({ title: 'Nicht gespeichert', description: result.error, variant: 'destructive' })
      } else {
        toast({ title: 'Als gemacht markiert' })
      }
      router.refresh()
    })
  }

  return (
    <Card className={cn(done && 'border-primary/40')}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="w-full text-left"
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base">{exercise.title}</CardTitle>
            <ChevronDown
              className={cn('size-5 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')}
              aria-hidden
            />
          </div>
          <CardDescription>{exercise.goal}</CardDescription>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary">{AREA_LABEL[exercise.area]}</Badge>
            <Badge variant="outline">
              <Clock className="size-3" aria-hidden />
              {exercise.durationMin} Min
            </Badge>
            {done && (
              <Badge>
                <Check className="size-3" aria-hidden />
                gemacht
              </Badge>
            )}
          </div>
        </CardHeader>
      </button>

      {open && (
        <CardContent className="flex flex-col gap-3">
          <p className="flex items-start gap-2 text-sm text-muted-foreground">
            <Package className="mt-0.5 size-4 shrink-0" aria-hidden />
            {exercise.material}
          </p>
          <ol className="flex flex-col gap-2">
            {exercise.steps.map((step, index) => (
              <li key={step} className="flex gap-3 text-sm leading-relaxed">
                <span
                  aria-hidden
                  className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary"
                >
                  {index + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
          <Button variant={done ? 'outline' : 'default'} onClick={markDone} disabled={pending}>
            <Check aria-hidden />
            {done ? 'Nochmal gemacht' : 'Als gemacht markieren'}
          </Button>
        </CardContent>
      )}
    </Card>
  )
}
