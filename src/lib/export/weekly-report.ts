import 'server-only'
import { formatDateShort, formatDuration } from '@/lib/time'
import type { StatsBundle } from '@/lib/stats/queries'
import { DEFAULT_UNITS, formatVolume, type UnitPrefs } from '@/lib/units'
import {
  BODY_SIZE,
  MARGIN,
  INK,
  MUTED,
  TITLE_SIZE,
  drawBullet,
  drawHeading,
  drawRows,
  drawRule,
  drawText,
  neuesDokument,
} from '@/lib/print/document'

/**
 * Wochenbericht als PDF.
 *
 * Die Zeichenfunktionen liegen in `src/lib/print/document.ts` – dieselben, die
 * das Stillprotokoll und der Zettel fuer die Ordination benutzen.
 */

export type WeeklyReportInput = {
  childName: string
  childAgeLabel: string | null
  householdName: string
  stats: StatsBundle
  timezone: string
  /** Wachstumswerte der Woche, falls vorhanden. */
  growth?: { label: string; value: string }[]
  /** Kurzer, automatisch erzeugter Wochenrueckblick. */
  summary: string[]
  /** Einheiten des Haushalts; der Bericht folgt der Einstellung. */
  units?: UnitPrefs
}

export async function buildWeeklyReportPdf(input: WeeklyReportInput): Promise<Uint8Array> {
  const doc = await neuesDokument(`Sprösslingsbericht ${input.childName}`)
  const { pdf, cursor, regular, bold, width } = doc

  const { stats } = input
  const units = input.units ?? DEFAULT_UNITS
  const from = stats.from
  const to = new Date(stats.to.getTime() - 1)

  // -------------------------------------------------------------- Kopf ----
  drawText(cursor, `Wochenbericht ${input.childName}`, bold, TITLE_SIZE, INK)
  cursor.y -= 6
  drawText(
    cursor,
    `${formatDateShort(from, input.timezone)} bis ${formatDateShort(to, input.timezone)}` +
      (input.childAgeLabel ? ` - ${input.childAgeLabel}` : ''),
    regular,
    BODY_SIZE,
    MUTED,
  )
  cursor.y -= 14
  drawRule(cursor, width)

  // ------------------------------------------------------ Zusammenfassung --
  if (input.summary.length > 0) {
    drawHeading(cursor, 'Die Woche in Kürze', bold)
    for (const line of input.summary) {
      drawBullet(cursor, line, regular, width)
    }
    cursor.y -= 8
  }

  // -------------------------------------------------------------- Schlaf ---
  drawHeading(cursor, 'Schlaf', bold)
  drawRows(cursor, regular, bold, width, [
    ['Gesamt', formatDuration(stats.sleep.totalMin * 60, { short: true })],
    ['Pro Tag im Schnitt', formatDuration((stats.sleep.totalMin / 7) * 60, { short: true })],
    ['Davon nachts', formatDuration(stats.sleep.nightMin * 60, { short: true })],
    ['Längster Block', formatDuration(stats.sleep.longestBlockMin * 60, { short: true })],
    ['Nickerchen', String(stats.sleep.naps)],
    ['Nachtwachen', String(stats.sleep.wakeCount)],
    [
      'Wachfenster (Median)',
      stats.sleep.medianWakeWindowMin === null
        ? '-'
        : formatDuration(stats.sleep.medianWakeWindowMin * 60, { short: true }),
    ],
  ])

  // ---------------------------------------------------------- Fuetterung ---
  drawHeading(cursor, 'Fütterung', bold)
  drawRows(cursor, regular, bold, width, [
    ['Mahlzeiten gesamt', String(stats.feeding.mealCount)],
    ['Stillmahlzeiten', `${stats.feeding.nursingCount} (${formatDuration(stats.feeding.nursingMin * 60, { short: true })})`],
    ['Flasche', `${stats.feeding.bottleCount} (${formatVolume(stats.feeding.bottleMl, units)})`],
    ['Abgepumpt', `${stats.feeding.pumpingCount} (${formatVolume(stats.feeding.pumpingMl, units)})`],
    ['Beikost', String(stats.feeding.solidsCount)],
    [
      'Abstand (Median)',
      stats.feeding.medianIntervalMin === null
        ? '-'
        : formatDuration(stats.feeding.medianIntervalMin * 60, { short: true }),
    ],
  ])

  // ------------------------------------------------------------- Windeln ---
  drawHeading(cursor, 'Windeln', bold)
  drawRows(cursor, regular, bold, width, [
    ['Gesamt', String(stats.diapers.total)],
    ['Pro Tag', stats.diapers.perDay === null ? '-' : String(stats.diapers.perDay)],
    ['Nass / Voll / Beides', `${stats.diapers.wet} / ${stats.diapers.dirty} / ${stats.diapers.both}`],
  ])

  // ------------------------------------------------------------ Wachstum ---
  if (input.growth && input.growth.length > 0) {
    drawHeading(cursor, 'Wachstum', bold)
    drawRows(cursor, regular, bold, width, input.growth.map((entry) => [entry.label, entry.value]))
  }

  // ---------------------------------------------------------- Tagestabelle -
  drawHeading(cursor, 'Tag für Tag', bold)
  const header: [string, string] = ['Tag', 'Schlaf / Mahlzeiten / Windeln']
  drawRows(cursor, regular, bold, width, [
    header,
    ...stats.daily.map(
      (day) =>
        [
          formatDateShort(day.dayStart, input.timezone),
          `${formatDuration(day.sleepMin * 60, { short: true })} / ${day.feeds} / ${day.diapers}`,
        ] as [string, string],
    ),
  ])

  // ---------------------------------------------------------------- Fuss ---
  cursor.y = Math.min(cursor.y, MARGIN + 34)
  drawRule(cursor, width)
  drawText(
    cursor,
    'Sprössling - selbst gehostet. Diese Auswertung beschreibt die eingetragenen Daten und ist',
    regular,
    8.5,
    MUTED,
  )
  drawText(cursor, 'keine medizinische Bewertung.', regular, 8.5, MUTED)

  return pdf.save()
}
