/**
 * Automatisch erzeugter Wochenrueckblick.
 *
 * Formuliert beschreibend, nie bewertend: Was war, was hat sich gegenueber der
 * Vorwoche veraendert. Keine Empfehlungen, keine Diagnosen.
 */
import { formatDuration } from '@/lib/time'
import type { StatsBundle } from './queries'

export type ReviewLine = string

function trend(current: number, previous: number, unit: (value: number) => string): string | null {
  if (previous === 0) return null
  const diff = current - previous
  const relative = Math.abs(diff) / previous
  // Unter fuenf Prozent Unterschied ist es Rauschen, kein Trend.
  if (relative < 0.05) return null
  return `${diff > 0 ? '+' : '−'}${unit(Math.abs(diff))} gegenüber der Vorwoche`
}

export function buildWeeklyReview(
  current: StatsBundle,
  previous: StatsBundle | null,
  childName: string,
): ReviewLine[] {
  const lines: ReviewLine[] = []
  const days = Math.max(1, Math.round((current.to.getTime() - current.from.getTime()) / 86400000))

  if (current.eventCount === 0) {
    return [`Für ${childName} wurde in dieser Woche nichts eingetragen.`]
  }

  // ------------------------------------------------------------- Schlaf ---
  const avgSleep = current.sleep.totalMin / days
  const sleepTrend = previous
    ? trend(current.sleep.totalMin, previous.sleep.totalMin, (value) =>
        formatDuration((value / days) * 60, { short: true }),
      )
    : null
  lines.push(
    `${childName} hat im Schnitt ${formatDuration(avgSleep * 60, { short: true })} pro Tag geschlafen` +
      (sleepTrend ? ` (${sleepTrend} pro Tag).` : '.'),
  )

  if (current.sleep.longestBlockMin > 0) {
    lines.push(
      `Der längste zusammenhängende Block war ${formatDuration(current.sleep.longestBlockMin * 60, { short: true })}.`,
    )
  }

  if (current.sleep.wakeCount > 0) {
    lines.push(
      `In den Nächten wurden ${current.sleep.wakeCount} ${
        current.sleep.wakeCount === 1 ? 'Nachtwache' : 'Nachtwachen'
      } notiert.`,
    )
  }

  if (current.sleep.medianWakeWindowMin !== null) {
    const previousWindow = previous?.sleep.medianWakeWindowMin
    const change =
      previousWindow != null && Math.abs(current.sleep.medianWakeWindowMin - previousWindow) >= 10
        ? current.sleep.medianWakeWindowMin > previousWindow
          ? ' – das Wachfenster ist länger geworden'
          : ' – das Wachfenster ist kürzer geworden'
        : ''
    lines.push(
      `Zwischen zwei Schlafphasen war ${childName} typischerweise ${formatDuration(
        current.sleep.medianWakeWindowMin * 60,
        { short: true },
      )} wach${change}.`,
    )
  }

  // --------------------------------------------------------- Fuetterung ---
  const avgMeals = current.feeding.mealCount / days
  lines.push(
    `Es gab ${current.feeding.mealCount} Mahlzeiten, also rund ${
      Math.round(avgMeals * 10) / 10
    } pro Tag.`,
  )

  if (current.feeding.bottleMl > 0) {
    lines.push(
      `Aus der Flasche kamen insgesamt ${current.feeding.bottleMl} ml (${Math.round(
        current.feeding.bottleMl / days,
      )} ml pro Tag).`,
    )
  }
  if (current.feeding.solidsCount > 0) {
    lines.push(`Beikost gab es ${current.feeding.solidsCount}-mal.`)
  }

  // ------------------------------------------------------------ Windeln ---
  if (current.diapers.total > 0) {
    lines.push(
      `${current.diapers.total} Windeln (${current.diapers.perDay} pro Tag), davon ${current.diapers.dirty + current.diapers.both} mit Stuhl.`,
    )
  }
  if (current.diapers.notable.length > 0) {
    lines.push(
      `Auffällig: ${current.diapers.notable
        .map((entry) => `${entry.count}× ${entry.color === 'red' ? 'rötlich' : 'weißlich oder grau'}`)
        .join(', ')}. Das gehört ärztlich abgeklärt.`,
    )
  }

  return lines
}
