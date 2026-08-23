/**
 * Fieberverlauf.
 *
 * Ausdruecklich nicht enthalten: jede Form von Dosisberechnung. Die App
 * rechnet keine Menge nach Gewicht oder Alter aus, schlaegt kein Praeparat
 * vor und prueft keine Hoechstmenge. Sie erinnert ausschliesslich an das
 * Intervall, das ihr selbst eingetragen habt, und zaehlt, was ihr gegeben
 * habt – mehr nicht. Alles Weitere gehoert in die Ordination.
 */
import { APP_TIMEZONE, formatTime } from '@/lib/time'

/** Ab hier gilt es als Fieber – und nur dafuer schaltet die Ansicht frei. */
export const FIEBER_AB_C = 37.5
/** Zweite Orientierungslinie im Verlauf. Keine Warnschwelle, nur eine Linie. */
export const HOHES_FIEBER_AB_C = 38.5
/** So weit zurueck gilt eine Episode als laufend. */
export const EPISODE_FENSTER_STUNDEN = 72

export const MESSORTE = ['rectal', 'ear', 'forehead', 'armpit'] as const
export type Messort = (typeof MESSORTE)[number]

export const MESSORT_LABEL: Record<Messort, string> = {
  rectal: 'rektal',
  ear: 'Ohr',
  forehead: 'Stirn',
  armpit: 'Achsel',
}

export type HealthEvent = {
  id: string
  startedAt: Date
  note: string | null
  payload: {
    kind?: string
    temperatureC?: number
    measuredAt?: string
    medication?: string
    doseMl?: number
    doseMg?: number
    repeatHours?: number
    symptom?: string
    vaccine?: string
  }
}

export type Messung = {
  id: string
  at: Date
  temperatureC: number
  ort: Messort | null
  note: string | null
}

export type Gabe = {
  id: string
  at: Date
  mittel: string
  doseMl: number | null
  doseMg: number | null
  repeatHours: number | null
  note: string | null
}

export type Symptom = { id: string; at: Date; text: string }

function istMessort(value: string | undefined): value is Messort {
  return value !== undefined && (MESSORTE as readonly string[]).includes(value)
}

export function messungen(events: HealthEvent[]): Messung[] {
  return events
    .filter((e) => e.payload.kind === 'temperature' && typeof e.payload.temperatureC === 'number')
    .map((e) => ({
      id: e.id,
      at: e.startedAt,
      temperatureC: e.payload.temperatureC as number,
      ort: istMessort(e.payload.measuredAt) ? e.payload.measuredAt : null,
      note: e.note,
    }))
    .sort((a, b) => a.at.getTime() - b.at.getTime())
}

export function gaben(events: HealthEvent[]): Gabe[] {
  return events
    .filter((e) => e.payload.kind === 'medication')
    .map((e) => ({
      id: e.id,
      at: e.startedAt,
      mittel: e.payload.medication?.trim() || 'Medikament',
      doseMl: typeof e.payload.doseMl === 'number' ? e.payload.doseMl : null,
      doseMg: typeof e.payload.doseMg === 'number' ? e.payload.doseMg : null,
      repeatHours: typeof e.payload.repeatHours === 'number' ? e.payload.repeatHours : null,
      note: e.note,
    }))
    .sort((a, b) => a.at.getTime() - b.at.getTime())
}

export function symptome(events: HealthEvent[]): Symptom[] {
  return events
    .filter((e) => e.payload.kind === 'symptom' && e.payload.symptom)
    .map((e) => ({ id: e.id, at: e.startedAt, text: e.payload.symptom as string }))
    .sort((a, b) => a.at.getTime() - b.at.getTime())
}

export type Episode = {
  /** Laeuft gerade eine Episode? Nur dann ist die Ansicht ueberhaupt sinnvoll. */
  aktiv: boolean
  /** Erste Messung ueber der Fieberschwelle in dieser Episode. */
  beginn: Date | null
  /** Letzte Messung ueber der Schwelle. */
  letzteUeberSchwelle: Date | null
  hoechste: Messung | null
  messungen: Messung[]
  gaben: Gabe[]
  symptome: Symptom[]
}

/**
 * Fasst die laufende Episode zusammen.
 *
 * Als Episode gilt die Kette fiebriger Messungen, die nicht laenger als
 * `EPISODE_FENSTER_STUNDEN` unterbrochen ist – nach drei Tagen ohne erhoehte
 * Temperatur faengt eine neue an.
 */
export function episode(events: HealthEvent[], now: Date = new Date()): Episode {
  const alleMessungen = messungen(events)
  const fenster = EPISODE_FENSTER_STUNDEN * 3600_000

  const fiebrig = alleMessungen.filter((m) => m.temperatureC > FIEBER_AB_C)
  const letzteFiebrig = fiebrig[fiebrig.length - 1] ?? null
  const aktiv = letzteFiebrig !== null && now.getTime() - letzteFiebrig.at.getTime() <= fenster

  if (!letzteFiebrig) {
    return {
      aktiv: false,
      beginn: null,
      letzteUeberSchwelle: null,
      hoechste: null,
      messungen: [],
      gaben: [],
      symptome: [],
    }
  }

  // Vom letzten Fiebermesswert rueckwaerts, solange die Luecke kleiner ist
  // als das Fenster.
  let beginn = letzteFiebrig.at
  for (let i = fiebrig.length - 1; i > 0; i -= 1) {
    const aktuell = fiebrig[i]!
    const davor = fiebrig[i - 1]!
    if (aktuell.at.getTime() - davor.at.getTime() > fenster) break
    beginn = davor.at
  }

  const bis = now.getTime()
  const imFenster = <T extends { at: Date }>(list: T[]) =>
    list.filter((x) => x.at.getTime() >= beginn.getTime() && x.at.getTime() <= bis)

  const eigene = imFenster(alleMessungen)
  const hoechste = eigene.reduce<Messung | null>(
    (max, m) => (!max || m.temperatureC > max.temperatureC ? m : max),
    null,
  )

  return {
    aktiv,
    beginn,
    letzteUeberSchwelle: letzteFiebrig.at,
    hoechste,
    messungen: eigene,
    gaben: imFenster(gaben(events)),
    symptome: imFenster(symptome(events)),
  }
}

// ------------------------------------------------------------- Intervalle --

export type Intervall = {
  mittel: string
  letzteGabe: Gabe
  /** Frueheste naechste Gabe – ausschliesslich aus dem eingetragenen Intervall. */
  fruehestensAb: Date | null
  fruehestensText: string | null
  /** Verbleibende Minuten; 0, sobald das Intervall um ist. */
  restMinuten: number
  /** Wie oft dieses Mittel in den letzten 24 Stunden gegeben wurde. */
  imLetztenTag: number
}

/**
 * Je Mittel: wann es zuletzt gegeben wurde, wann das selbst eingetragene
 * Intervall um ist, und wie oft es in 24 Stunden gegeben wurde.
 *
 * Die Zaehlung ist eine Zaehlung, keine Pruefung: es gibt keine Obergrenze,
 * keinen Alarm und keine Farbe, die etwas bewertet.
 */
export function intervalle(
  list: Gabe[],
  now: Date = new Date(),
  tz: string = APP_TIMEZONE,
): Intervall[] {
  const proMittel = new Map<string, Gabe[]>()
  for (const gabe of list) {
    proMittel.set(gabe.mittel, [...(proMittel.get(gabe.mittel) ?? []), gabe])
  }

  const tagesgrenze = now.getTime() - 24 * 3600_000

  return [...proMittel.entries()]
    .map(([mittel, gabenDesMittels]) => {
      const sortiert = [...gabenDesMittels].sort((a, b) => a.at.getTime() - b.at.getTime())
      const letzteGabe = sortiert[sortiert.length - 1]!
      const fruehestensAb = letzteGabe.repeatHours
        ? new Date(letzteGabe.at.getTime() + letzteGabe.repeatHours * 3600_000)
        : null

      return {
        mittel,
        letzteGabe,
        fruehestensAb,
        fruehestensText: fruehestensAb ? formatTime(fruehestensAb, tz) : null,
        restMinuten: fruehestensAb
          ? Math.max(0, Math.ceil((fruehestensAb.getTime() - now.getTime()) / 60000))
          : 0,
        imLetztenTag: sortiert.filter((g) => g.at.getTime() >= tagesgrenze).length,
      }
    })
    .sort((a, b) => b.letzteGabe.at.getTime() - a.letzteGabe.at.getTime())
}

/** "noch 2 Std 10 Min" – der Countdown bis zur fruehestmoeglichen naechsten Gabe. */
export function restText(restMinuten: number): string {
  if (restMinuten <= 0) return 'Intervall ist um'
  const stunden = Math.floor(restMinuten / 60)
  const minuten = restMinuten % 60
  if (stunden === 0) return `noch ${minuten} Min`
  if (minuten === 0) return `noch ${stunden} Std`
  return `noch ${stunden} Std ${minuten} Min`
}

// ---------------------------------------------------------- Zeitausschnitt --

export const ZEITRAEUME = [24, 48, 72] as const
export type Zeitraum = (typeof ZEITRAEUME)[number] | 'episode'

/** Startzeit des gewaehlten Ausschnitts. */
export function ausschnittVon(zeitraum: Zeitraum, ep: Episode, now: Date = new Date()): Date {
  if (zeitraum === 'episode') return ep.beginn ?? new Date(now.getTime() - 24 * 3600_000)
  return new Date(now.getTime() - zeitraum * 3600_000)
}
