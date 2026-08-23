import { Target } from 'lucide-react'
import type { SleepAnalysis } from '@/lib/sleep/analysis'
import { formatDuration } from '@/lib/time'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { clamp } from '@/lib/utils'

/**
 * Tagesziel: benoetigter Gesamtschlaf nach Alter gegen den tatsaechlichen.
 * Bewusst als Bereich, nicht als eine Zahl – Kinder streuen stark.
 */
export function DayGoalCard({ analysis }: { analysis: SleepAnalysis }) {
  const { todaySleepMin, targetSleepMin, targetSleepMax, todayNapCount, targetNapsMin, targetNapsMax } =
    analysis
  const percent = Math.round(clamp(todaySleepMin / targetSleepMin, 0, 1.3) * 100)
  const reached = todaySleepMin >= targetSleepMin

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="size-4 text-muted-foreground" aria-hidden />
          Tagesziel
        </CardTitle>
        <CardDescription>
          Üblich in diesem Alter: {formatDuration(targetSleepMin * 60)} bis{' '}
          {formatDuration(targetSleepMax * 60)} Schlaf in 24 Stunden
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <span className="font-display text-2xl font-bold tabular">
            {formatDuration(todaySleepMin * 60)}
          </span>
          <span className="text-sm text-muted-foreground">
            {reached ? 'im Zielbereich' : `noch ${formatDuration((targetSleepMin - todaySleepMin) * 60)}`}
          </span>
        </div>
        <Progress
          value={Math.min(100, percent)}
          aria-label={`${percent} Prozent des Tagesziels`}
        />
        <p className="text-sm text-muted-foreground">
          {todayNapCount} {todayNapCount === 1 ? 'Nickerchen' : 'Nickerchen'} heute · üblich sind{' '}
          {targetNapsMin === targetNapsMax
            ? targetNapsMin
            : `${targetNapsMin} bis ${targetNapsMax}`}
        </p>
      </CardContent>
    </Card>
  )
}
