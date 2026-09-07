import { FORECAST_HINWEIS } from '@/lib/sleep/wording'

/**
 * Steht fest unter jeder Ansicht mit einer Vorhersage und laesst sich nicht
 * wegklicken. Absichtlich unscheinbar, aber immer da: die Rechnung ist eine
 * Beobachtung der Vergangenheit, kein Plan fuer den Tag.
 */
export function ForecastNote() {
  return <p className="px-1 text-xs text-muted-foreground">{FORECAST_HINWEIS}</p>
}
