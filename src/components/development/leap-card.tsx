import { Waves } from 'lucide-react'
import type { ActiveLeap } from '@/lib/content/leaps'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

/**
 * Wird nur angezeigt, wenn gerade ein Sprungfenster läuft. Der Hinweis auf die
 * umstrittene Datenlage steht bewusst direkt dabei – die Karte soll erklären,
 * nicht Angst machen.
 */
export function LeapCard({ active }: { active: ActiveLeap }) {
  const { leap, progress } = active

  return (
    <Card className="border-primary/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Waves className="size-4 text-primary" aria-hidden />
          Sprungfenster: {leap.title}
        </CardTitle>
        <CardDescription>
          Woche {leap.fromWeek} bis {leap.toWeek} · dauert {leap.durationLabel}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Progress
          value={Math.round(progress * 100)}
          aria-label={`${Math.round(progress * 100)} Prozent des Sprungfensters`}
        />
        <p className="text-sm leading-relaxed">{leap.theme}</p>

        <div>
          <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Häufig in dieser Zeit
          </h3>
          <ul className="flex flex-col gap-0.5 text-sm">
            {leap.signs.map((sign) => (
              <li key={sign} className="flex gap-2">
                <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-muted-foreground" />
                {sign}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl bg-accent p-3">
          <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-accent-foreground">
            Danach oft neu
          </h3>
          <ul className="flex flex-col gap-0.5 text-sm">
            {leap.gains.map((gain) => (
              <li key={gain} className="flex gap-2">
                <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                {gain}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs leading-relaxed text-muted-foreground">
          Die feste Einteilung der Sprünge ist wissenschaftlich umstritten – Studien konnten die
          exakten Zeitpunkte nicht bestätigen. Als Erklärung dafür, warum eine Woche gerade
          anstrengend ist, kann sie trotzdem hilfreich sein.
        </p>
      </CardContent>
    </Card>
  )
}
