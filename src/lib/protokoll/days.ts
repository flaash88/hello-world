/**
 * Stillprotokoll: eine Zeile je Kalendertag.
 *
 * Zweck ist der Hausbesuch. Die Hebamme schaut zehn Sekunden auf die Tabelle
 * und weiss, wie oft angelegt wurde, wie viel dazugefuettert wurde, wie die
 * Windeln aussahen und was die Waage sagt. Deshalb keine Diagramme, keine
 * Nullen in leeren Zellen und keine Deutung – nur Zahlen.
 */
import { addDays, ageInDays, localDateKey, startOfLocalDay } from '@/lib/time'
import { overlapMinutes, type StatEvent } from '@/lib/stats/aggregate'

/** Waehlbare Zeitraeume in Tagen. */
export const PROTOKOLL_TAGE = [1, 3, 7, 14] as const
export type ProtokollTage = (typeof PROTOKOLL_TAGE)[number]
export const PROTOKOLL_STANDARD: ProtokollTage = 7

export type Gewichtsmessung = { measuredAt: Date; weightKg: number }

export type ProtokollZeile = {
  dayKey: string
  dayStart: Date
  /** Lebenstag; null, wenn kein Geburtsdatum hinterlegt ist. */
  lebenstag: number | null
  /** Stillvorgaenge, nicht Seiten. */
  anlegen: number
  /** Mittlere Dauer eines Stillvorgangs in Minuten; null ohne Zeitangabe. */
  stillDauerMin: number | null
  flasche: number
  flascheMl: number | null
  windelnNass: number
  windelnVoll: number
  /** Schlaf des Kalendertags in Minuten, ueber Mitternacht anteilig. */
  schlafMin: number
  /** Letzte Messung des Tages in Gramm; null, wenn nicht gewogen wurde. */
  gewichtG: number | null
}

export type ProtokollSumme = {
  tage: number
  anlegen: number
  stillDauerMin: number | null
  flasche: number
  flascheMl: number | null
  windelnNass: number
  windelnVoll: number
  schlafMin: number
}

export type Protokoll = {
  von: Date
  bis: Date
  zeilen: ProtokollZeile[]
  /** Durchschnitt je Tag ueber den gewaehlten Zeitraum. */
  schnitt: ProtokollSumme
}

function payloadOf(event: StatEvent): Record<string, unknown> {
  return event.payload && typeof event.payload === 'object'
    ? (event.payload as Record<string, unknown>)
    : {}
}

function zahl(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

/**
 * Baut die Tabelle. `bis` ist der Beginn des Tages nach dem letzten
 * angezeigten – so wie ueberall sonst in den Auswertungen auch.
 */
export function protokoll(
  events: readonly StatEvent[],
  messungen: readonly Gewichtsmessung[],
  opts: {
    tage: number
    birthDate: Date | null
    timezone: string
    now?: Date
  },
): Protokoll {
  const now = opts.now ?? new Date()
  const tz = opts.timezone
  const bis = addDays(startOfLocalDay(now, tz), 1, tz)
  const von = addDays(bis, -opts.tage, tz)

  const zeilen: ProtokollZeile[] = []
  let cursor = von

  while (cursor.getTime() < bis.getTime()) {
    const next = addDays(cursor, 1, tz)
    const amTag = (event: StatEvent) => event.startedAt >= cursor && event.startedAt < next

    const stillen = events.filter((event) => event.type === 'nursing' && amTag(event))
    const stillDauern = stillen
      .map((event) => event.durationSec)
      .filter((sek): sek is number => typeof sek === 'number' && sek > 0)

    const flaschen = events.filter((event) => event.type === 'bottle' && amTag(event))
    const flaschenMengen = flaschen
      .map((event) => {
        const payload = payloadOf(event)
        const menge = zahl(payload.amountMl)
        if (menge === null) return null
        return Math.max(0, menge - (zahl(payload.leftoverMl) ?? 0))
      })
      .filter((ml): ml is number => ml !== null)

    const windeln = events.filter((event) => event.type === 'diaper' && amTag(event))
    const windelArt = (event: StatEvent) => String(payloadOf(event).kind ?? 'wet')

    const schlaf = events.filter((event) => event.type === 'sleep')

    // Am selben Tag mehrfach gewogen: die spaeteste Messung gilt.
    const tagesMessungen = messungen
      .filter((m) => m.measuredAt >= cursor && m.measuredAt < next)
      .sort((a, b) => a.measuredAt.getTime() - b.measuredAt.getTime())
    const letzte = tagesMessungen[tagesMessungen.length - 1]

    zeilen.push({
      dayKey: localDateKey(cursor, tz),
      dayStart: cursor,
      lebenstag: opts.birthDate ? ageInDays(opts.birthDate, cursor, tz) : null,
      anlegen: stillen.length,
      stillDauerMin:
        stillDauern.length > 0
          ? Math.round(stillDauern.reduce((a, b) => a + b, 0) / stillDauern.length / 60)
          : null,
      flasche: flaschen.length,
      flascheMl:
        flaschenMengen.length > 0
          ? Math.round(flaschenMengen.reduce((a, b) => a + b, 0))
          : null,
      // "Beides" zaehlt in beide Spalten – die Hebamme fragt nach nass und voll,
      // nicht nach der Zahl der Windeln.
      windelnNass: windeln.filter((event) => ['wet', 'both'].includes(windelArt(event))).length,
      windelnVoll: windeln.filter((event) => ['dirty', 'both'].includes(windelArt(event))).length,
      schlafMin: Math.round(
        schlaf.reduce((summe, event) => summe + overlapMinutes(event, cursor, next, now), 0),
      ),
      gewichtG: letzte ? Math.round(letzte.weightKg * 1000) : null,
    })

    cursor = next
  }

  // Neueste Zeile oben.
  zeilen.reverse()

  return { von, bis, zeilen, schnitt: schnittVon(zeilen) }
}

/**
 * Durchschnitt je Tag. Bei ⌀ Dauer und ml zaehlen nur Tage, an denen es
 * ueberhaupt etwas gab – sonst zieht ein reiner Stilltag den Flaschenschnitt
 * gegen null und behauptet etwas, das nicht stimmt.
 */
export function schnittVon(zeilen: readonly ProtokollZeile[]): ProtokollSumme {
  const tage = zeilen.length
  if (tage === 0) {
    return {
      tage: 0,
      anlegen: 0,
      stillDauerMin: null,
      flasche: 0,
      flascheMl: null,
      windelnNass: 0,
      windelnVoll: 0,
      schlafMin: 0,
    }
  }

  const mittel = (werte: number[]) =>
    werte.length > 0 ? werte.reduce((a, b) => a + b, 0) / werte.length : null

  const dauern = zeilen.map((z) => z.stillDauerMin).filter((v): v is number => v !== null)
  const mengen = zeilen.map((z) => z.flascheMl).filter((v): v is number => v !== null)

  const proTag = (auswahl: (zeile: ProtokollZeile) => number) =>
    Math.round((zeilen.reduce((summe, zeile) => summe + auswahl(zeile), 0) / tage) * 10) / 10

  return {
    tage,
    anlegen: proTag((z) => z.anlegen),
    stillDauerMin: dauern.length > 0 ? Math.round(mittel(dauern)!) : null,
    flasche: proTag((z) => z.flasche),
    flascheMl: mengen.length > 0 ? Math.round(mittel(mengen)!) : null,
    windelnNass: proTag((z) => z.windelnNass),
    windelnVoll: proTag((z) => z.windelnVoll),
    schlafMin: Math.round(zeilen.reduce((summe, z) => summe + z.schlafMin, 0) / tage),
  }
}

/** "7 h 20" – kompakt genug fuer eine Tabellenspalte. */
export function schlafText(minuten: number): string {
  if (minuten <= 0) return ''
  const stunden = Math.floor(minuten / 60)
  const rest = Math.round(minuten % 60)
  if (stunden === 0) return `${rest} min`
  return `${stunden} h ${String(rest).padStart(2, '0')}`
}

/** Leere Zellen bleiben leer – eine 0 behauptet, es sei nichts gewesen. */
export function zellenText(value: number | null | undefined): string {
  if (value === null || value === undefined || value === 0) return ''
  return String(value)
}
