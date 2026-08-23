import 'server-only'
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import { formatDateShort, formatDuration } from '@/lib/time'
import type { StatsBundle } from '@/lib/stats/queries'
import { DEFAULT_UNITS, formatVolume, type UnitPrefs } from '@/lib/units'

/**
 * Wochenbericht als PDF.
 *
 * Bewusst schlicht: eine Seite, Helvetica, keine eingebetteten Schriften.
 * pdf-lib kodiert die Standardschriften als WinAnsi – Umlaute funktionieren,
 * exotischere Zeichen nicht, deshalb werden sie vorher ersetzt.
 */

const MARGIN = 48
const TITLE_SIZE = 20
const HEADING_SIZE = 12
const BODY_SIZE = 10.5

const INK = rgb(0.14, 0.11, 0.09)
const MUTED = rgb(0.45, 0.4, 0.36)
const ACCENT = rgb(0.75, 0.34, 0.23)

/** Ersetzt Zeichen, die WinAnsi nicht kennt. */
function ascii(text: string): string {
  return text
    .replace(/[–—]/g, '-')
    .replace(/[„“”]/g, '"')
    .replace(/[‚‘’]/g, "'")
    .replace(/…/g, '...')
    .replace(/·/g, '-')
    .replace(/ /g, ' ')
    .replace(/[^\x20-\xFF]/g, '')
}

type Cursor = { page: PDFPage; y: number }

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
  const pdf = await PDFDocument.create()
  pdf.setTitle(`Sprösslingsbericht ${input.childName}`)
  pdf.setCreator('Sprössling')
  pdf.setProducer('Sprössling')

  const regular = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)

  const page = pdf.addPage([595.28, 841.89]) // A4
  const cursor: Cursor = { page, y: 841.89 - MARGIN }
  const width = 595.28 - 2 * MARGIN

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

function drawText(cursor: Cursor, text: string, font: PDFFont, size: number, color = INK): void {
  cursor.page.drawText(ascii(text), { x: MARGIN, y: cursor.y, size, font, color })
  cursor.y -= size + 4
}

function drawHeading(cursor: Cursor, text: string, font: PDFFont): void {
  cursor.y -= 8
  cursor.page.drawText(ascii(text), { x: MARGIN, y: cursor.y, size: HEADING_SIZE, font, color: ACCENT })
  cursor.y -= HEADING_SIZE + 6
}

function drawRule(cursor: Cursor, width: number): void {
  cursor.page.drawLine({
    start: { x: MARGIN, y: cursor.y },
    end: { x: MARGIN + width, y: cursor.y },
    thickness: 0.75,
    color: rgb(0.85, 0.82, 0.78),
  })
  cursor.y -= 14
}

function drawBullet(cursor: Cursor, text: string, font: PDFFont, width: number): void {
  const lines = wrap(ascii(text), font, BODY_SIZE, width - 14)
  lines.forEach((line, index) => {
    cursor.page.drawText(index === 0 ? `- ${line}` : `  ${line}`, {
      x: MARGIN,
      y: cursor.y,
      size: BODY_SIZE,
      font,
      color: INK,
    })
    cursor.y -= BODY_SIZE + 4
  })
}

function drawRows(
  cursor: Cursor,
  regular: PDFFont,
  bold: PDFFont,
  width: number,
  rows: [string, string][],
): void {
  for (const [label, value] of rows) {
    cursor.page.drawText(ascii(label), {
      x: MARGIN,
      y: cursor.y,
      size: BODY_SIZE,
      font: regular,
      color: MUTED,
    })
    const text = ascii(value)
    const textWidth = bold.widthOfTextAtSize(text, BODY_SIZE)
    cursor.page.drawText(text, {
      x: MARGIN + width - textWidth,
      y: cursor.y,
      size: BODY_SIZE,
      font: bold,
      color: INK,
    })
    cursor.y -= BODY_SIZE + 6
  }
}

/** Einfacher Wortumbruch auf eine Zielbreite. */
function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let current = ''

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && current) {
      lines.push(current)
      current = word
    } else {
      current = candidate
    }
  }
  if (current) lines.push(current)
  return lines
}
