'use client'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import type { Exercise, ExerciseArea } from '@/lib/content/exercises'
import { AREA_LABEL, EXERCISE_AREAS } from '@/lib/content/exercises'
import { ExerciseCard } from '@/components/development/exercise-card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { EmptyState } from '@/components/ui/empty-state'
import { Dumbbell } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ExerciseList({
  exercises,
  childId,
  doneIds,
  activeArea,
  showAll,
}: {
  exercises: Exercise[]
  childId: string
  doneIds: string[]
  activeArea: ExerciseArea | null
  showAll: boolean
}) {
  const [hideDone, setHideDone] = useState(false)

  const visible = useMemo(
    () => (hideDone ? exercises.filter((exercise) => !doneIds.includes(exercise.id)) : exercises),
    [exercises, doneIds, hideDone],
  )

  function href(next: { bereich?: string | null; alter?: string | null }): string {
    const params = new URLSearchParams()
    const bereich = next.bereich === undefined ? activeArea : next.bereich
    const alter = next.alter === undefined ? (showAll ? 'alle' : null) : next.alter
    if (bereich) params.set('bereich', bereich)
    if (alter) params.set('alter', alter)
    const query = params.toString()
    return query ? `/entwicklung/uebungen?${query}` : '/entwicklung/uebungen'
  }

  return (
    <div className="flex flex-col gap-4">
      <nav aria-label="Nach Bereich filtern">
        <ul className="flex gap-2 overflow-x-auto pb-1">
          <li>
            <Link
              href={href({ bereich: null })}
              aria-current={activeArea === null ? 'page' : undefined}
              className={cn(
                'flex min-h-12 items-center whitespace-nowrap rounded-full border-2 px-4 text-sm font-semibold',
                activeArea === null ? 'border-primary bg-primary/10 text-primary' : 'border-border',
              )}
            >
              Alle
            </Link>
          </li>
          {EXERCISE_AREAS.map((area) => (
            <li key={area}>
              <Link
                href={href({ bereich: area })}
                aria-current={activeArea === area ? 'page' : undefined}
                className={cn(
                  'flex min-h-12 items-center whitespace-nowrap rounded-full border-2 px-4 text-sm font-semibold',
                  activeArea === area ? 'border-primary bg-primary/10 text-primary' : 'border-border',
                )}
              >
                {AREA_LABEL[area]}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="flex items-center justify-between gap-4">
        <Label htmlFor="hideDone">Gemachte ausblenden</Label>
        <Switch id="hideDone" checked={hideDone} onCheckedChange={setHideDone} />
      </div>

      <div className="flex items-center justify-between gap-4">
        <Label htmlFor="showAll">Auch Übungen für später zeigen</Label>
        <Link
          href={href({ alter: showAll ? null : 'alle' })}
          id="showAll"
          role="switch"
          aria-checked={showAll}
          className={cn(
            'flex h-8 w-14 shrink-0 items-center rounded-full border-2 border-transparent px-0.5 transition-colors',
            showAll ? 'bg-primary' : 'bg-muted',
          )}
        >
          <span
            aria-hidden
            className={cn(
              'block size-7 rounded-full bg-card shadow transition-transform',
              showAll && 'translate-x-6',
            )}
          />
        </Link>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={Dumbbell}
          title="Keine Übungen übrig"
          description="Blende die gemachten wieder ein oder wähle einen anderen Bereich."
        />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {visible.length} {visible.length === 1 ? 'Übung' : 'Übungen'}
          </p>
          <ul className="flex flex-col gap-2">
            {visible.map((exercise) => (
              <li key={exercise.id}>
                <ExerciseCard
                  exercise={exercise}
                  childId={childId}
                  done={doneIds.includes(exercise.id)}
                />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
