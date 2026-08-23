/**
 * Einzeilige Zusammenfassungen fuer Listen und die Timer-Leiste. Bewusst kurz –
 * das ist der Text, den man um drei Uhr früh mit halb offenen Augen liest.
 */
import { formatDuration } from '@/lib/time'
import {
  DEFAULT_UNITS,
  formatTemperature,
  formatVolume,
  type UnitPrefs,
} from '@/lib/units'
import {
  BOTTLE_CONTENT_LABEL,
  DIAPER_KIND_LABEL,
  EVENT_CATEGORIES,
  HEALTH_KIND_LABEL,
  MOOD_REASON_LABEL,
  NURSING_SIDE_LABEL,
  OTHER_KIND_LABEL,
  SLEEP_AID_LABEL,
  SLEEP_KIND_LABEL,
  SLEEP_LOCATION_LABEL,
  STOOL_COLORS,
  STOOL_TEXTURES,
  type EventType,
} from './types'

export type EventLike = {
  type: string
  startedAt: Date | string
  endedAt: Date | string | null
  durationSec: number | null
  payload: unknown
  note?: string | null
}

function asRecord(payload: unknown): Record<string, unknown> {
  return payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {}
}

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function str(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

/** Titel des Eintrags, z. B. "Nickerchen" oder "Flasche · Pre-Nahrung". */
export function eventTitle(event: EventLike): string {
  const p = asRecord(event.payload)
  const category = EVENT_CATEGORIES[event.type as EventType]
  const fallback = category?.label ?? 'Eintrag'

  switch (event.type) {
    case 'sleep': {
      const kind = str(p.kind)
      return kind ? (SLEEP_KIND_LABEL[kind as 'nap' | 'night'] ?? fallback) : fallback
    }
    case 'nursing': {
      const side = str(p.side)
      return side ? `Stillen · ${NURSING_SIDE_LABEL[side as 'left'] ?? side}` : fallback
    }
    case 'bottle': {
      const content = str(p.content)
      return content ? `Flasche · ${BOTTLE_CONTENT_LABEL[content] ?? content}` : fallback
    }
    case 'diaper': {
      const kind = str(p.kind)
      return kind ? `Windel · ${DIAPER_KIND_LABEL[kind as 'wet'] ?? kind}` : fallback
    }
    case 'health': {
      const kind = str(p.kind)
      return kind ? (HEALTH_KIND_LABEL[kind as 'temperature'] ?? fallback) : fallback
    }
    case 'other': {
      const label = str(p.label)
      if (label) return label
      const kind = str(p.kind)
      return kind ? (OTHER_KIND_LABEL[kind] ?? fallback) : fallback
    }
    default:
      return fallback
  }
}

/** Zweite Zeile mit den Details, oder null wenn es nichts zu sagen gibt. */
export function eventDetail(event: EventLike, units: UnitPrefs = DEFAULT_UNITS): string | null {
  const p = asRecord(event.payload)
  const parts: string[] = []

  switch (event.type) {
    case 'sleep': {
      const location = str(p.location)
      if (location) parts.push(SLEEP_LOCATION_LABEL[location] ?? location)
      const aid = str(p.aid)
      if (aid) parts.push(SLEEP_AID_LABEL[aid] ?? aid)
      const fallAsleep = num(p.fallAsleepSec)
      if (fallAsleep !== null && fallAsleep > 0) {
        parts.push(`${formatDuration(fallAsleep, { short: true })} bis zum Einschlafen`)
      }
      const wakes = num(p.wakeCount)
      if (wakes !== null && wakes > 0) parts.push(`${wakes}× wach`)
      break
    }
    case 'nursing': {
      const left = num(p.leftSec)
      const right = num(p.rightSec)
      if (left !== null && left > 0) parts.push(`links ${formatDuration(left, { short: true })}`)
      if (right !== null && right > 0) parts.push(`rechts ${formatDuration(right, { short: true })}`)
      break
    }
    case 'bottle': {
      const amount = num(p.amountMl)
      if (amount !== null) parts.push(formatVolume(amount, units))
      const leftover = num(p.leftoverMl)
      if (leftover !== null && leftover > 0) parts.push(`${formatVolume(leftover, units)} übrig`)
      break
    }
    case 'pumping': {
      const total = num(p.amountMl)
      const left = num(p.leftMl)
      const right = num(p.rightMl)
      if (total !== null) parts.push(formatVolume(total, units))
      else if (left !== null || right !== null) {
        parts.push(formatVolume((left ?? 0) + (right ?? 0), units))
      }
      const side = str(p.side)
      if (side) parts.push(NURSING_SIDE_LABEL[side as 'left'] ?? side)
      break
    }
    case 'solids': {
      const foods = Array.isArray(p.foods) ? (p.foods as unknown[]).filter((f): f is string => typeof f === 'string') : []
      if (foods.length > 0) parts.push(foods.join(', '))
      if (p.firstTime === true) parts.push('erstes Mal')
      const reaction = str(p.reaction)
      if (reaction) {
        const labels: Record<string, string> = {
          liked: 'hat geschmeckt',
          neutral: 'ging so',
          refused: 'verweigert',
          reaction: 'Reaktion beobachtet',
        }
        parts.push(labels[reaction] ?? reaction)
      }
      break
    }
    case 'diaper': {
      const color = str(p.color)
      if (color) {
        const entry = STOOL_COLORS.find((c) => c.value === color)
        if (entry) parts.push(entry.label)
      }
      const texture = str(p.texture)
      if (texture) {
        const entry = STOOL_TEXTURES.find((t) => t.value === texture)
        if (entry) parts.push(entry.label)
      }
      if (p.leaked === true) parts.push('ausgelaufen')
      break
    }
    case 'mood': {
      const intensity = num(p.intensity)
      if (intensity !== null) parts.push(`Intensität ${intensity}/5`)
      const reason = str(p.reason)
      if (reason) parts.push(MOOD_REASON_LABEL[reason] ?? reason)
      const soothed = str(p.soothedBy)
      if (soothed) parts.push(`beruhigt durch ${soothed}`)
      break
    }
    case 'health': {
      const temp = num(p.temperatureC)
      if (temp !== null) parts.push(formatTemperature(temp, units))
      const medication = str(p.medication)
      if (medication) {
        const doseMg = num(p.doseMg)
        const doseMl = num(p.doseMl)
        // Medikamentendosen bleiben in ml und mg: Das steht so auf der Packung.
        const dose = doseMl !== null ? `${doseMl} ml` : doseMg !== null ? `${doseMg} mg` : null
        parts.push(dose ? `${medication}, ${dose}` : medication)
      }
      const symptom = str(p.symptom)
      if (symptom) parts.push(symptom)
      const vaccine = str(p.vaccine)
      if (vaccine) parts.push(vaccine)
      break
    }
    default:
      break
  }

  if (event.note) parts.push(event.note)
  return parts.length > 0 ? parts.join(' · ') : null
}

/** Dauer eines Eintrags in Sekunden, oder null bei Punkt-Events. */
export function eventDurationSec(event: EventLike, now: Date = new Date()): number | null {
  if (event.durationSec !== null && event.durationSec !== undefined) return event.durationSec
  const start = new Date(event.startedAt).getTime()
  const end = event.endedAt ? new Date(event.endedAt).getTime() : now.getTime()
  const category = EVENT_CATEGORIES[event.type as EventType]
  if (!category?.timed) return null
  return Math.max(0, Math.round((end - start) / 1000))
}
