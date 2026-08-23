/**
 * Der Milchvorrat: was ist da, was laeuft als naechstes ab, was ist hinueber.
 *
 * Reine Logik, keine DB. Die Haltbarkeiten kommen von aussen herein, damit
 * die im Haushalt eingestellten Werte gelten und nicht die Vorgaben.
 */
import { APP_TIMEZONE, formatDateShort, formatDateTime } from '@/lib/time'
import {
  LAGERORTE,
  LAGERORT_LABEL,
  type Haltbarkeiten,
  type Lagerort,
} from './storage'

export const PORTION_STATUS = ['vorraetig', 'verbraucht', 'verworfen'] as const
export type PortionStatus = (typeof PORTION_STATUS)[number]

export type Portion = {
  id: string
  abgepumptAm: Date
  mengeMl: number
  lagerort: string
  behaelter: string | null
  status: string
  aufgetautAm: Date | null
  verbrauchtAm: Date | null
  notiz: string | null
}

export function istLagerort(value: string): value is Lagerort {
  return (LAGERORTE as readonly string[]).includes(value)
}

/**
 * Wann die Portion abgelaufen ist.
 *
 * Aufgetaute Milch zaehlt ab dem Auftauen mit dem kurzen Fenster – das
 * urspruengliche Datum spielt dann keine Rolle mehr.
 */
export function ablaufAm(portion: Portion, haltbarkeiten: Haltbarkeiten): Date {
  if (portion.aufgetautAm) {
    return new Date(portion.aufgetautAm.getTime() + haltbarkeiten.aufgetaut * 3600_000)
  }
  const ort = istLagerort(portion.lagerort) ? portion.lagerort : 'kuehlschrank'
  return new Date(portion.abgepumptAm.getTime() + haltbarkeiten[ort] * 3600_000)
}

export type PortionZustand = {
  portion: Portion
  ablauf: Date
  abgelaufen: boolean
  /** Verbleibende Stunden; negativ, wenn die Portion schon hinueber ist. */
  restStunden: number
  aufgetaut: boolean
  text: string
}

export function zustand(
  portion: Portion,
  haltbarkeiten: Haltbarkeiten,
  now: Date = new Date(),
  tz: string = APP_TIMEZONE,
): PortionZustand {
  const ablauf = ablaufAm(portion, haltbarkeiten)
  const restStunden = (ablauf.getTime() - now.getTime()) / 3600_000
  const abgelaufen = restStunden <= 0

  return {
    portion,
    ablauf,
    abgelaufen,
    restStunden,
    aufgetaut: portion.aufgetautAm !== null,
    text: abgelaufen
      ? `abgelaufen am ${formatDateShort(ablauf, tz)}`
      : restStunden < 48
        ? `haltbar bis ${formatDateTime(ablauf, tz)}`
        : `haltbar bis ${formatDateShort(ablauf, tz)}`,
  }
}

export type Gruppe = {
  lagerort: Lagerort
  label: string
  portionen: PortionZustand[]
  summeMl: number
  anzahl: number
}

/**
 * Vorraetige Portionen nach Lagerort, innerhalb der Gruppe nach Ablauf
 * sortiert – aelteste zuerst, damit sie zuerst drankommt (FIFO).
 * Abgelaufenes kommt ans Ende der Gruppe.
 */
export function gruppen(
  portionen: Portion[],
  haltbarkeiten: Haltbarkeiten,
  now: Date = new Date(),
  tz: string = APP_TIMEZONE,
): Gruppe[] {
  const vorraetig = portionen
    .filter((p) => p.status === 'vorraetig')
    .map((p) => zustand(p, haltbarkeiten, now, tz))

  return LAGERORTE.map((lagerort) => {
    const eigene = vorraetig
      .filter((z) => z.portion.lagerort === lagerort)
      .sort((a, b) => {
        if (a.abgelaufen !== b.abgelaufen) return a.abgelaufen ? 1 : -1
        return a.ablauf.getTime() - b.ablauf.getTime()
      })

    return {
      lagerort,
      label: LAGERORT_LABEL[lagerort],
      portionen: eigene,
      summeMl: eigene.filter((z) => !z.abgelaufen).reduce((sum, z) => sum + z.portion.mengeMl, 0),
      anzahl: eigene.filter((z) => !z.abgelaufen).length,
    }
  }).filter((gruppe) => gruppe.portionen.length > 0)
}

/**
 * Die Portion, die als naechstes verwendet werden sollte: die vorraetige mit
 * dem fruehesten Ablauf, die noch nicht abgelaufen ist.
 */
export function alsNaechstes(
  portionen: Portion[],
  haltbarkeiten: Haltbarkeiten,
  now: Date = new Date(),
): PortionZustand | null {
  const offen = portionen
    .filter((p) => p.status === 'vorraetig')
    .map((p) => zustand(p, haltbarkeiten, now))
    .filter((z) => !z.abgelaufen)
    .sort((a, b) => a.ablauf.getTime() - b.ablauf.getTime())
  return offen[0] ?? null
}

/** Alles Vorraetige, das abgelaufen ist – gehoert weg, aber ohne Drama. */
export function abgelaufene(
  portionen: Portion[],
  haltbarkeiten: Haltbarkeiten,
  now: Date = new Date(),
): PortionZustand[] {
  return portionen
    .filter((p) => p.status === 'vorraetig')
    .map((p) => zustand(p, haltbarkeiten, now))
    .filter((z) => z.abgelaufen)
    .sort((a, b) => a.ablauf.getTime() - b.ablauf.getTime())
}

export type VorratStatistik = {
  vorratMl: number
  vorratPortionen: number
  abgelaufenMl: number
  verbrauchtMl30Tage: number
  verworfenMl30Tage: number
  abgepumptMl30Tage: number
  /** Durchschnittliche Portionsgroesse der letzten 30 Tage. */
  schnittMl: number | null
}

export function statistik(
  portionen: Portion[],
  haltbarkeiten: Haltbarkeiten,
  now: Date = new Date(),
): VorratStatistik {
  const grenze = now.getTime() - 30 * 86400_000
  const letzte30 = portionen.filter((p) => p.abgepumptAm.getTime() >= grenze)

  const vorraetig = portionen
    .filter((p) => p.status === 'vorraetig')
    .map((p) => zustand(p, haltbarkeiten, now))

  const abgepumptMl30Tage = letzte30.reduce((sum, p) => sum + p.mengeMl, 0)
  const verworfenMl30Tage = letzte30
    .filter((p) => p.status === 'verworfen')
    .reduce((sum, p) => sum + p.mengeMl, 0)

  return {
    vorratMl: vorraetig.filter((z) => !z.abgelaufen).reduce((sum, z) => sum + z.portion.mengeMl, 0),
    vorratPortionen: vorraetig.filter((z) => !z.abgelaufen).length,
    abgelaufenMl: vorraetig.filter((z) => z.abgelaufen).reduce((sum, z) => sum + z.portion.mengeMl, 0),
    verbrauchtMl30Tage: letzte30
      .filter((p) => p.status === 'verbraucht')
      .reduce((sum, p) => sum + p.mengeMl, 0),
    verworfenMl30Tage,
    abgepumptMl30Tage,
    // Bewusst keine Verwurfsquote in Prozent: die verworfene Menge steht als
    // Zahl da, der Anteil daran macht daraus einen Vorwurf.
    schnittMl: letzte30.length > 0 ? Math.round(abgepumptMl30Tage / letzte30.length) : null,
  }
}

/**
 * Teilentnahme: die Portion wird um `mengeMl` kleiner. Bleibt ein Rest,
 * bleibt die Portion vorraetig; sonst gilt sie als verbraucht.
 */
export function nachEntnahme(
  portion: Portion,
  mengeMl: number,
): { restMl: number; status: PortionStatus } {
  const rest = Math.max(0, portion.mengeMl - Math.max(0, mengeMl))
  return { restMl: rest, status: rest > 0 ? 'vorraetig' : 'verbraucht' }
}
