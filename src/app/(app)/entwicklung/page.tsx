import type { Metadata } from 'next'
import Link from 'next/link'
import { Baby, ChevronRight, Dumbbell, Flag, Smile, Sparkles, TrendingUp } from 'lucide-react'
import { getAppContext } from '@/lib/household'
import { prisma } from '@/lib/db'
import { ageInWeeks, localDateKey } from '@/lib/time'
import { correctedAgeDays } from '@/lib/sleep/windows'
import { weekContent } from '@/lib/content/weeks'
import { activeLeap, nextLeap } from '@/lib/content/leaps'
import { exerciseOfTheDay } from '@/lib/content/exercises'
import { MILESTONES, milestonesForAge, overdueMilestones } from '@/lib/content/milestones'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { LeapCard } from '@/components/development/leap-card'
import { ExerciseCard } from '@/components/development/exercise-card'
import { MedicalDisclaimer } from '@/components/medical-disclaimer'

export const metadata: Metadata = { title: 'Entwicklung' }

export default async function DevelopmentPage() {
  const ctx = await getAppContext()
  const child = ctx.activeChild

  if (!child?.birthDate) {
    return (
      <EmptyState
        icon={Baby}
        title="Noch kein Kind angelegt"
        description="Die Entwicklungsinhalte richten sich nach dem Alter eures Kindes."
      />
    )
  }

  const weeks = ageInWeeks(child.birthDate, new Date(), ctx.timezone)
  // Sprünge und Content rechnen mit dem korrigierten Alter, wenn ein ET
  // hinterlegt ist – bei einem Frühchen wäre alles sonst zu früh angesetzt.
  const correctedWeeks = Math.floor(
    correctedAgeDays(weeks * 7, child.birthDate, child.dueDate) / 7,
  )

  const [content, milestones, exerciseLogs] = await Promise.all([
    weekContent(correctedWeeks),
    prisma.milestone.findMany({ where: { childId: child.id } }),
    prisma.exerciseLog.findMany({
      where: { childId: child.id },
      select: { exerciseId: true },
      distinct: ['exerciseId'],
    }),
  ])

  const toothCount = await prisma.tooth.count({
    where: { childId: child.id, eruptedOn: { not: null }, lostOn: null },
  })

  const achievedKeys = milestones
    .filter((milestone) => milestone.key && milestone.achievedAt)
    .map((milestone) => milestone.key!)

  const leap = activeLeap(correctedWeeks)
  const upcoming = nextLeap(correctedWeeks)
  const doneExercises = exerciseLogs.map((log) => log.exerciseId)
  const suggestion = exerciseOfTheDay(
    correctedWeeks,
    localDateKey(new Date(), ctx.timezone),
    doneExercises,
  )
  const openMilestones = milestonesForAge(correctedWeeks).filter(
    (milestone) => !achievedKeys.includes(milestone.key),
  )
  const overdue = overdueMilestones(correctedWeeks, achievedKeys)

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold">Entwicklung</h1>
        <p className="text-muted-foreground">
          {child.name} · Lebenswoche {weeks}
          {correctedWeeks !== weeks && ` (korrigiert ${correctedWeeks})`}
        </p>
      </div>

      {leap && <LeapCard active={leap} />}

      {content && (
        <Link href="/entwicklung/woche" className="block">
          <Card className="transition-colors hover:border-primary">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="size-4 text-primary" aria-hidden />
                  {content.title}
                </CardTitle>
                <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
              </div>
              <CardDescription>{content.ageLabel}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                {content.sections[0]?.body}
              </p>
            </CardContent>
          </Card>
        </Link>
      )}

      {suggestion && (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
              Übung des Tages
            </h2>
            <Link
              href="/entwicklung/uebungen"
              className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-primary"
            >
              Alle Übungen
              <ChevronRight className="size-4" aria-hidden />
            </Link>
          </div>
          <ExerciseCard
            exercise={suggestion}
            childId={child.id}
            done={doneExercises.includes(suggestion.id)}
            defaultOpen
          />
        </section>
      )}

      <Link href="/entwicklung/meilensteine" className="block">
        <Card className="transition-colors hover:border-primary">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Flag className="size-4 text-primary" aria-hidden />
                Meilensteine
              </CardTitle>
              <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
            </div>
            <CardDescription>
              {achievedKeys.length} von {MILESTONES.length} abgehakt
            </CardDescription>
          </CardHeader>
          {openMilestones.length > 0 && (
            <CardContent>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Gerade im Zeitfenster
              </p>
              <div className="flex flex-wrap gap-1.5">
                {openMilestones.slice(0, 4).map((milestone) => (
                  <Badge key={milestone.key} variant="secondary">
                    {milestone.title}
                  </Badge>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      </Link>

      <Link href="/zaehne" className="block">
        <Card className="transition-colors hover:border-primary">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Smile className="size-4 text-primary" aria-hidden />
                Zähne
              </CardTitle>
              <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
            </div>
            <CardDescription>
              {toothCount > 0
                ? `${toothCount} von 20 Milchzähnen eingetragen`
                : 'Zwanzig Milchzähne, einer nach dem anderen'}
            </CardDescription>
          </CardHeader>
        </Card>
      </Link>

      {overdue.length > 0 && (
        <Card className="border-primary/40">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="size-4 text-primary" aria-hidden />
              Beim nächsten Termin ansprechen
            </CardTitle>
            <CardDescription>
              Diese Schritte liegen über dem üblichen Zeitfenster. Das ist oft harmlos – erwähnt
              es trotzdem bei der nächsten Untersuchung.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-1 text-sm">
              {overdue.map((milestone) => (
                <li key={milestone.key} className="flex gap-2">
                  <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                  {milestone.title}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {!leap && upcoming && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Dumbbell className="size-4 text-muted-foreground" aria-hidden />
              Nächster Entwicklungssprung
            </CardTitle>
            <CardDescription>
              {upcoming.leap.title} · voraussichtlich in {upcoming.weeksUntil}{' '}
              {upcoming.weeksUntil === 1 ? 'Woche' : 'Wochen'}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <MedicalDisclaimer>
        Alle Zeitangaben sind breite Durchschnittswerte. Kinder entwickeln sich in
        unterschiedlichem Tempo und in unterschiedlicher Reihenfolge – die Abweichung allein sagt
        nichts aus.
      </MedicalDisclaimer>
    </div>
  )
}
