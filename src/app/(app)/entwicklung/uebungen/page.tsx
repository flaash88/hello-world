import type { Metadata } from 'next'
import { Baby } from 'lucide-react'
import { getAppContext } from '@/lib/household'
import { prisma } from '@/lib/db'
import { ageInWeeks } from '@/lib/time'
import { correctedAgeDays } from '@/lib/sleep/windows'
import { EXERCISE_AREAS, exercisesForAge, type ExerciseArea } from '@/lib/content/exercises'
import { EmptyState } from '@/components/ui/empty-state'
import { BackLink } from '@/components/layout/back-link'
import { ExerciseList } from './exercise-list'

export const metadata: Metadata = { title: 'Übungen' }

export default async function ExercisesPage({
  searchParams,
}: {
  searchParams: Promise<{ bereich?: string; alter?: string }>
}) {
  const ctx = await getAppContext()
  const child = ctx.activeChild

  if (!child?.birthDate) {
    return (
      <EmptyState
        icon={Baby}
        title="Noch kein Kind angelegt"
        description="Die Übungen richten sich nach dem Alter eures Kindes."
      />
    )
  }

  const params = await searchParams
  const area =
    params.bereich && (EXERCISE_AREAS as readonly string[]).includes(params.bereich)
      ? (params.bereich as ExerciseArea)
      : null

  const weeks = ageInWeeks(child.birthDate, new Date(), ctx.timezone)
  const correctedWeeks = Math.floor(
    correctedAgeDays(weeks * 7, child.birthDate, child.dueDate) / 7,
  )
  const showAll = params.alter === 'alle'

  const exercises = showAll
    ? [...exercisesForAge(correctedWeeks), ...exercisesForAge(correctedWeeks + 20)]
        .filter((exercise, index, list) => list.findIndex((e) => e.id === exercise.id) === index)
        .filter((exercise) => !area || exercise.area === area)
    : exercisesForAge(correctedWeeks, area ? { area } : {})

  const logs = await prisma.exerciseLog.findMany({
    where: { childId: child.id },
    select: { exerciseId: true },
    distinct: ['exerciseId'],
  })

  return (
    <div className="flex flex-col gap-4">
      <BackLink href="/entwicklung" label="Entwicklung" />
      <h1 className="font-display text-2xl font-bold">Übungen</h1>
      <p className="text-muted-foreground">
        Passend für Woche {correctedWeeks}. Alle Übungen brauchen nur, was ohnehin im Haus ist.
      </p>
      <ExerciseList
        exercises={exercises}
        childId={child.id}
        doneIds={logs.map((log) => log.exerciseId)}
        activeArea={area}
        showAll={showAll}
      />
    </div>
  )
}
