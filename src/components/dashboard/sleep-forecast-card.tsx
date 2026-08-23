import { Moon, Sparkles, TriangleAlert } from 'lucide-react'
import type { SleepAnalysis } from '@/lib/sleep/analysis'
import { formatDuration, formatTime } from '@/lib/time'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SleepPressureRing } from './sleep-pressure-ring'
import { cn } from '@/lib/utils'

const LEVEL_TEXT = {
  fresh: 'Frisch und ausgeschlafen',
  building: 'Schlafdruck baut sich auf',
  ready: 'Bereit fürs nächste Schläfchen',
  overtired: 'Vermutlich schon übermüdet',
} as const

/**
 * Die wichtigste Karte des Dashboards: Wie lange ist das Kind wach, wann ist
 * das nächste Schlaffenster – und wie sicher ist das überhaupt.
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
            Noch keine Vorhersage
          </CardTitle>
          <CardDescription>
            Sobald der erste Schlaf eingetragen und beendet ist, rechnet Sprössling mit.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className={cn(pressure.level === 'overtired' && 'border-destructive/50')}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          {pressure.level === 'overtired' ? (
            <TriangleAlert className="size-5 text-destructive" aria-hidden />
          ) : (
            <Moon className="size-5 text-cat-sleep" aria-hidden />
          )}
          {LEVEL_TEXT[pressure.level]}
        </CardTitle>
        <CardDescription>
          Wach seit {formatDuration(pressure.awakeMin * 60)}
          {analysis.lastWakeAt && ` · aufgewacht um ${formatTime(analysis.lastWakeAt, timezone)}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center gap-4">
        <SleepPressureRing ratio={pressure.ratio} level={pressure.level} />
        <div className="min-w-0 flex-1">
          {model.calibrating ? (
            <>
              <p className="flex items-center gap-1.5 font-semibold">
                <Sparkles className="size-4 text-primary" aria-hidden />
                Kalibriert noch
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Nach ein paar mehr Schlafeinträgen kennt Sprössling den Rhythmus eures Kindes und
                sagt das nächste Fenster genauer vorher. Bis dahin gilt der Erfahrungswert für
                dieses Alter: rund {formatDuration(model.baselineMin * 60)} wach.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {model.sampleSize === 0
                  ? 'Noch keine gemessenen Wachfenster.'
                  : `${model.sampleSize} von 5 nötigen Messungen.`}
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                {forecast.kind === 'bedtime' ? 'Bettzeit' : 'Nächstes Nickerchen'}
              </p>
              <p className="font-display text-2xl font-bold tabular">
                {formatTime(forecast.from, timezone)}–{formatTime(forecast.to, timezone)}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <Badge variant={forecast.confidence >= 0.6 ? 'default' : 'muted'}>
                  Konfidenz {Math.round(forecast.confidence * 100)} %
                </Badge>
                {forecast.due && <Badge variant="secondary">Fenster läuft</Badge>}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Wachfenster aktuell rund {formatDuration(model.expectedMin * 60)} · aus{' '}
                {model.sampleSize} Messungen der letzten zwei Wochen
              </p>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
