import { Moon } from 'lucide-react'
import type { SleepAnalysis } from '@/lib/sleep/analysis'
import { formatDuration, formatTime } from '@/lib/time'
import {
  kalibrierText,
  muedigkeitText,
  schlafdruckText,
  wachSeitText,
  wachfensterText,
} from '@/lib/sleep/wording'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SleepPressureRing } from './sleep-pressure-ring'
import { ForecastNote } from './forecast-note'

/**
 * Wie lange das Kind wach ist und wann zuletzt Müdigkeit kam.
 *
 * Bewusst ohne Ampel: kein rotes „übermüdet", keine Konfidenzzahl, kein
 * Countdown. Was daraus folgt, entscheiden die Eltern – die Karte stellt nur
 * fest, was war. Der feste Hinweissatz steht darunter und bleibt.
 */
export function SleepForecastCard({
  analysis,
  timezone,
}: {
  analysis: SleepAnalysis
  timezone: string
}) {
  const { pressure, forecast, model, sleepingSince } = analysis

  if (sleepingSince) {
    return (
      <Card className="border-cat-sleep/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Moon className="size-5 text-cat-sleep" aria-hidden />
            Schläft gerade
          </CardTitle>
          <CardDescription>
            Seit {formatTime(sleepingSince, timezone)} ·{' '}
            {formatDuration((Date.now() - sleepingSince.getTime()) / 1000)}
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (!pressure || !forecast) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Moon className="size-5 text-muted-foreground" aria-hidden />
            Noch nichts zu rechnen
          </CardTitle>
          <CardDescription>
            Sobald ein Schlaf eingetragen und beendet ist, steht hier, wie der Tag zuletzt lief.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Moon className="size-5 text-cat-sleep" aria-hidden />
            {schlafdruckText(pressure.level)}
          </CardTitle>
          <CardDescription>
            {wachSeitText(pressure)}
            {analysis.lastWakeAt && ` · aufgewacht um ${formatTime(analysis.lastWakeAt, timezone)}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <SleepPressureRing ratio={pressure.ratio} awakeMin={pressure.awakeMin} />
          <div className="min-w-0 flex-1">
            {model.calibrating ? (
              <p className="text-sm text-muted-foreground">{kalibrierText(model)}</p>
            ) : (
              <>
                <p className="font-semibold">{muedigkeitText(forecast, timezone)}</p>
                <p className="mt-1 text-sm text-muted-foreground">{wachfensterText(model)}</p>
              </>
            )}
          </div>
        </CardContent>
      </Card>
      <ForecastNote />
    </div>
  )
}
