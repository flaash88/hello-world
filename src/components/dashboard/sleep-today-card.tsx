import { Moon } from 'lucide-react'
import type { SleepAnalysis } from '@/lib/sleep/analysis'
import { formatDuration } from '@/lib/time'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

/**
 * Was heute an Schlaf zusammengekommen ist – der tatsaechliche Wert, sonst
 * nichts. Kein Balken, kein Sollwert, kein "noch X bis zum Ziel": ein Kind,
 * das weniger schlaeft als eine Tabelle sagt, hat kein Defizit.
 *
 * Die Alterspanne steht als Nebensatz dabei, weil sie beim Einordnen hilft.
 * Sie ist eine Beobachtung an vielen Kindern, keine Vorgabe an dieses.
 */
export function SleepTodayCard({ analysis }: { analysis: SleepAnalysis }) {
  const { todaySleepMin, targetSleepMin, targetSleepMax, todayNapCount, targetNapsMin, targetNapsMax } =
    analysis

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Moon className="size-4 text-muted-foreground" aria-hidden />
          Schlaf heute
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <p className="font-display text-2xl font-bold tabular">
          {formatDuration(todaySleepMin * 60)}
        </p>
        <p className="text-sm text-muted-foreground">
          {todayNapCount === 1 ? 'Ein Schlaf' : `${todayNapCount} Schlafeinträge`} bisher.
        </p>
        <p className="text-sm text-muted-foreground">
          Bei Kindern in diesem Alter liegen dazwischen meist{' '}
          {formatDuration(targetSleepMin * 60)} bis {formatDuration(targetSleepMax * 60)} in 24
          Stunden, verteilt auf{' '}
          {targetNapsMin === targetNapsMax
            ? targetNapsMin
            : `${targetNapsMin} bis ${targetNapsMax}`}{' '}
          Abschnitte. Die Spanne ist breit, und eures muss sie nicht treffen.
        </p>
      </CardContent>
    </Card>
  )
}
