/**
 * CSV-Export je Kategorie.
 *
 * Trennzeichen ist das Semikolon: Excel in deutscher Spracheinstellung
 * erwartet das, und Dezimalkommas kollidieren sonst mit dem Komma-Trenner.
 * Ausgegeben wird mit BOM, damit Umlaute in Excel richtig ankommen.
 */
import { formatDateTime } from '@/lib/time'
import {
  BOTTLE_CONTENT_LABEL,
  DIAPER_KIND_LABEL,
  MOOD_REASON_LABEL,
  NURSING_SIDE_LABEL,
  SLEEP_AID_LABEL,
  SLEEP_KIND_LABEL,
  SLEEP_LOCATION_LABEL,
  STOOL_COLORS,
  STOOL_TEXTURES,
  type EventType,
} from '@/lib/events/types'

export const CSV_BOM = '﻿'

export type ExportEvent = {
  id: string
  type: string
  startedAt: Date
  endedAt: Date | null
  durationSec: number | null
  payload: unknown
  note: string | null
  createdBy: string
}

function escape(value: unknown): string {
  if (value === null || value === undefined) return ''
  const text = String(value)
  return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function decimal(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return ''
  return value.toFixed(digits).replace('.', ',')
}

function label(map: Record<string, string>, value: unknown): string {
  return typeof value === 'string' ? (map[value] ?? value) : ''
}

function payloadOf(event: ExportEvent): Record<string, unknown> {
  return event.payload && typeof event.payload === 'object'
    ? (event.payload as Record<string, unknown>)
    : {}
}

function num(event: ExportEvent, key: string): number | null {
  const value = payloadOf(event)[key]
  return typeof value === 'number' ? value : null
}

type ColumnSet = { headers: string[]; row: (event: ExportEvent, tz: string) => string[] }

const BASE_HEADERS = ['Beginn', 'Ende', 'Dauer (Min)', 'Eingetragen von', 'Notiz']

function baseRow(event: ExportEvent, tz: string): string[] {
  return [
    formatDateTime(event.startedAt, tz),
    event.endedAt ? formatDateTime(event.endedAt, tz) : '',
    event.durationSec !== null ? decimal(event.durationSec / 60, 1) : '',
    event.createdBy,
    event.note ?? '',
  ]
}

const COLUMNS: Record<EventType, ColumnSet> = {
  sleep: {
    headers: [...BASE_HEADERS, 'Art', 'Ort', 'Einschlafhilfe', 'Einschlafdauer (Min)', 'Nachtwachen'],
    row: (event, tz) => [
      ...baseRow(event, tz),
      label(SLEEP_KIND_LABEL, payloadOf(event).kind),
      label(SLEEP_LOCATION_LABEL, payloadOf(event).location),
      label(SLEEP_AID_LABEL, payloadOf(event).aid),
      decimal(num(event, 'fallAsleepSec') === null ? null : num(event, 'fallAsleepSec')! / 60, 0),
      num(event, 'wakeCount') === null ? '' : String(num(event, 'wakeCount')),
    ],
  },
  nursing: {
    headers: [...BASE_HEADERS, 'Seite', 'Links (Min)', 'Rechts (Min)'],
    row: (event, tz) => [
      ...baseRow(event, tz),
      label(NURSING_SIDE_LABEL, payloadOf(event).side),
      decimal(num(event, 'leftSec') === null ? null : num(event, 'leftSec')! / 60, 0),
      decimal(num(event, 'rightSec') === null ? null : num(event, 'rightSec')! / 60, 0),
    ],
  },
  bottle: {
    headers: [...BASE_HEADERS, 'Inhalt', 'Menge (ml)', 'Rest (ml)'],
    row: (event, tz) => [
      ...baseRow(event, tz),
      label(BOTTLE_CONTENT_LABEL, payloadOf(event).content),
      decimal(num(event, 'amountMl'), 0),
      decimal(num(event, 'leftoverMl'), 0),
    ],
  },
  pumping: {
    headers: [...BASE_HEADERS, 'Seite', 'Gesamt (ml)', 'Links (ml)', 'Rechts (ml)'],
    row: (event, tz) => [
      ...baseRow(event, tz),
      label(NURSING_SIDE_LABEL, payloadOf(event).side),
      decimal(num(event, 'amountMl'), 0),
      decimal(num(event, 'leftMl'), 0),
      decimal(num(event, 'rightMl'), 0),
    ],
  },
  solids: {
    headers: [...BASE_HEADERS, 'Lebensmittel', 'Menge', 'Reaktion', 'Erstes Mal'],
    row: (event, tz) => {
      const foods = payloadOf(event).foods
      return [
        ...baseRow(event, tz),
        Array.isArray(foods) ? foods.join(', ') : '',
        label(
          { taste: 'Gekostet', little: 'Ein wenig', half: 'Halbe Portion', full: 'Ganze Portion' },
          payloadOf(event).amount,
        ),
        label(
          { liked: 'Hat geschmeckt', neutral: 'Ging so', refused: 'Verweigert', reaction: 'Reaktion' },
          payloadOf(event).reaction,
        ),
        payloadOf(event).firstTime === true ? 'ja' : '',
      ]
    },
  },
  diaper: {
    headers: [...BASE_HEADERS, 'Inhalt', 'Farbe', 'Konsistenz', 'Ausgelaufen'],
    row: (event, tz) => [
      ...baseRow(event, tz),
      label(DIAPER_KIND_LABEL, payloadOf(event).kind),
      label(Object.fromEntries(STOOL_COLORS.map((c) => [c.value, c.label])), payloadOf(event).color),
      label(Object.fromEntries(STOOL_TEXTURES.map((t) => [t.value, t.label])), payloadOf(event).texture),
      payloadOf(event).leaked === true ? 'ja' : '',
    ],
  },
  mood: {
    headers: [...BASE_HEADERS, 'Intensität', 'Vermuteter Grund', 'Was geholfen hat'],
    row: (event, tz) => [
      ...baseRow(event, tz),
      num(event, 'intensity') === null ? '' : String(num(event, 'intensity')),
      label(MOOD_REASON_LABEL, payloadOf(event).reason),
      typeof payloadOf(event).soothedBy === 'string' ? String(payloadOf(event).soothedBy) : '',
    ],
  },
  health: {
    headers: [...BASE_HEADERS, 'Art', 'Temperatur (°C)', 'Medikament', 'Dosis (ml)', 'Dosis (mg)', 'Symptom', 'Impfung'],
    row: (event, tz) => [
      ...baseRow(event, tz),
      label(
        { temperature: 'Temperatur', medication: 'Medikament', symptom: 'Symptom', vaccination: 'Impfung', appointment: 'Arzttermin' },
        payloadOf(event).kind,
      ),
      decimal(num(event, 'temperatureC'), 1),
      typeof payloadOf(event).medication === 'string' ? String(payloadOf(event).medication) : '',
      decimal(num(event, 'doseMl'), 1),
      decimal(num(event, 'doseMg'), 0),
      typeof payloadOf(event).symptom === 'string' ? String(payloadOf(event).symptom) : '',
      typeof payloadOf(event).vaccine === 'string' ? String(payloadOf(event).vaccine) : '',
    ],
  },
  other: {
    headers: [...BASE_HEADERS, 'Art', 'Bezeichnung'],
    row: (event, tz) => [
      ...baseRow(event, tz),
      label(
        { bath: 'Baden', teething: 'Zahnen', walk: 'Spaziergang', tummytime: 'Bauchlage', play: 'Spielen', note: 'Notiz' },
        payloadOf(event).kind,
      ),
      typeof payloadOf(event).label === 'string' ? String(payloadOf(event).label) : '',
    ],
  },
}

/** CSV fuer genau eine Kategorie. */
export function eventsToCsv(type: EventType, events: readonly ExportEvent[], timezone: string): string {
  const columns = COLUMNS[type]
  const lines = [columns.headers.map(escape).join(';')]
  for (const event of events.filter((entry) => entry.type === type)) {
    lines.push(columns.row(event, timezone).map(escape).join(';'))
  }
  return CSV_BOM + lines.join('\r\n') + '\r\n'
}

/** Wachstumsmessungen als CSV. */
export function measurementsToCsv(
  measurements: readonly {
    measuredAt: Date
    weightKg: number | null
    lengthCm: number | null
    headCm: number | null
    note: string | null
  }[],
  timezone: string,
): string {
  const lines = [['Gemessen am', 'Gewicht (kg)', 'Länge (cm)', 'Kopfumfang (cm)', 'Notiz'].join(';')]
  for (const measurement of measurements) {
    lines.push(
      [
        formatDateTime(measurement.measuredAt, timezone),
        decimal(measurement.weightKg, 3),
        decimal(measurement.lengthCm, 1),
        decimal(measurement.headCm, 1),
        measurement.note ?? '',
      ]
        .map(escape)
        .join(';'),
    )
  }
  return CSV_BOM + lines.join('\r\n') + '\r\n'
}
