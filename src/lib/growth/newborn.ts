/**
 * Gewichtsverlauf der ersten Wochen.
 *
 * In den ersten Tagen verliert fast jedes Neugeborene an Gewicht – bis etwa
 * 7 % ist das der Normalfall, bis 10 % kommt vor. Danach geht es wieder
 * hinauf, und das Geburtsgewicht ist ueblicherweise nach ein bis zwei Wochen
 * wieder erreicht.
 *
 * Diese Datei rechnet, sie bewertet nicht. Der einzige Hinweis, den sie
 * ausloest, ist die Anregung, es bei der Hebamme anzusprechen – einmal, ohne
 * Farbe, ohne Ausrufezeichen. Eine Diagnose stellt hier niemand.
 */
import { ageInDays, APP_TIMEZONE, localDateKey } from '@/lib/time'

/** Bis hierher gilt die eigene Ansicht; danach zaehlen die Perzentile. */
export const NEUGEBORENEN_WOCHEN = 6
/** Zeitachse des Diagramms in Lebenstagen. */
export const VERLAUF_TAGE = 28

/** Referenzlinien im Diagramm. Markierungen, keine Grenzwerte. */
export const HINWEIS_AB_PROZENT = -10
export const ERWARTBAR_BIS_PROZENT = -7
/** Bis zu diesem Lebenstag ist das Geburtsgewicht ueblicherweise wieder da. */
export const ZURUECK_BIS_LEBENSTAG = 14

export type Messung = {
  id: string
  measuredAt: Date
  weightG: number
}

export type VerlaufPunkt = {
  lebenstag: number
  weightG: number
  measuredAt: Date
  /** Abweichung vom Geburtsgewicht in Prozent, eine Nachkommastelle. */
  prozent: number
  differenzG: number
}

export type NeugeborenenVerlauf = {
  birthWeightG: number
  punkte: VerlaufPunkt[]
  aktuell: VerlaufPunkt | null
  /** Niedrigste Messung; null, wenn es noch keine gibt. */
  tiefstwert: VerlaufPunkt | null
  /** Erste Messung, die das Geburtsgewicht wieder erreicht oder ueberschreitet. */
  zurueckAm: VerlaufPunkt | null
  /** Mittlere Zunahme seit dem Tiefstwert in Gramm pro Tag, ueber die letzten drei Messungen. */
  zunahmeGProTag: number | null
  /** Soll der Hinweis auf die Hebamme erscheinen? */
  hebammeAnsprechen: boolean
  hebammeGrund: 'verlust' | 'dauer' | null
}

/** Prozent auf eine Nachkommastelle – ohne die Rundungsfehler von toFixed. */
function prozentVon(weightG: number, birthWeightG: number): number {
  return Math.round(((weightG - birthWeightG) / birthWeightG) * 1000) / 10
}

/**
 * Baut den Verlauf aus Geburtsgewicht und Messungen.
 *
 * Mehrere Messungen am selben Kalendertag: die spaeteste gewinnt. Zwei Werte
 * fuer denselben Tag im Diagramm waeren nur Rauschen, und gewogen wird ohnehin
 * meist einmal taeglich.
 */
export function neugeborenenVerlauf(
  birthDate: Date,
  birthWeightG: number,
  messungen: Messung[],
  now: Date = new Date(),
  tz: string = APP_TIMEZONE,
): NeugeborenenVerlauf {
  const proTag = new Map<string, Messung>()
  for (const messung of messungen) {
    const key = localDateKey(messung.measuredAt, tz)
    const vorhanden = proTag.get(key)
    if (!vorhanden || messung.measuredAt.getTime() > vorhanden.measuredAt.getTime()) {
      proTag.set(key, messung)
    }
  }

  const punkte: VerlaufPunkt[] = [...proTag.values()]
    .sort((a, b) => a.measuredAt.getTime() - b.measuredAt.getTime())
    .map((messung) => ({
      lebenstag: ageInDays(birthDate, messung.measuredAt, tz),
      weightG: messung.weightG,
      measuredAt: messung.measuredAt,
      prozent: prozentVon(messung.weightG, birthWeightG),
      differenzG: messung.weightG - birthWeightG,
    }))

  const aktuell = punkte[punkte.length - 1] ?? null

  const tiefstwert = punkte.reduce<VerlaufPunkt | null>(
    (min, punkt) => (!min || punkt.weightG < min.weightG ? punkt : min),
    null,
  )

  const zurueckAm = punkte.find((punkt) => punkt.weightG >= birthWeightG) ?? null

  return {
    birthWeightG,
    punkte,
    aktuell,
    tiefstwert,
    zurueckAm,
    zunahmeGProTag: zunahmeSeitTiefstwert(punkte, tiefstwert),
    ...hebammenhinweis(birthDate, punkte, aktuell, zurueckAm, now, tz),
  }
}

/**
 * Mittlere Zunahme in Gramm pro Tag seit dem Tiefstwert, gerechnet ueber die
 * letzten drei Messungen. Weniger als zwei Punkte nach dem Tief ergeben keine
 * Steigung – dann bleibt der Wert leer, statt eine Zahl zu erfinden.
 */
function zunahmeSeitTiefstwert(
  punkte: VerlaufPunkt[],
  tiefstwert: VerlaufPunkt | null,
): number | null {
  if (!tiefstwert) return null

  const abTief = punkte.filter((punkt) => punkt.lebenstag >= tiefstwert.lebenstag)
  const fenster = abTief.slice(-3)
  if (fenster.length < 2) return null

  const erste = fenster[0]!
  const letzte = fenster[fenster.length - 1]!
  const tage = letzte.lebenstag - erste.lebenstag
  if (tage <= 0) return null

  return Math.round((letzte.weightG - erste.weightG) / tage)
}

/**
 * Der einzige Hinweis dieser Ansicht: mehr als 10 % Verlust, oder das
 * Geburtsgewicht ist bis Lebenstag 14 nicht wieder erreicht. Beides ist kein
 * Alarm, sondern etwas, das die Hebamme wissen will.
 */
function hebammenhinweis(
  birthDate: Date,
  punkte: VerlaufPunkt[],
  aktuell: VerlaufPunkt | null,
  zurueckAm: VerlaufPunkt | null,
  now: Date,
  tz: string,
): { hebammeAnsprechen: boolean; hebammeGrund: 'verlust' | 'dauer' | null } {
  if (punkte.length === 0) return { hebammeAnsprechen: false, hebammeGrund: null }

  // Ist das Geburtsgewicht wieder da, ist die Frage erledigt – auch wenn es
  // zwischendurch weiter hinunterging.
  if (zurueckAm) return { hebammeAnsprechen: false, hebammeGrund: null }

  if (aktuell && aktuell.prozent <= HINWEIS_AB_PROZENT) {
    return { hebammeAnsprechen: true, hebammeGrund: 'verlust' }
  }

  const lebenstagHeute = ageInDays(birthDate, now, tz)
  if (lebenstagHeute > ZURUECK_BIS_LEBENSTAG) {
    return { hebammeAnsprechen: true, hebammeGrund: 'dauer' }
  }

  return { hebammeAnsprechen: false, hebammeGrund: null }
}

/** Gilt fuer dieses Kind noch die Neugeborenen-Ansicht? */
export function istNeugeborenes(
  birthDate: Date | null,
  now: Date = new Date(),
  tz: string = APP_TIMEZONE,
): boolean {
  if (!birthDate) return false
  return ageInDays(birthDate, now, tz) < NEUGEBORENEN_WOCHEN * 7
}

/** "−6,4 %" bzw. "+1,2 %" – mit echtem Minuszeichen, nicht mit Bindestrich. */
export function prozentText(prozent: number, locale = 'de-AT'): string {
  const zahl = Math.abs(prozent).toLocaleString(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })
  if (prozent === 0) return '±0,0 %'
  return `${prozent < 0 ? '−' : '+'}${zahl} %`
}

/** "−210 g" bzw. "+80 g". */
export function grammText(differenzG: number, locale = 'de-AT'): string {
  const zahl = Math.abs(differenzG).toLocaleString(locale)
  if (differenzG === 0) return '±0 g'
  return `${differenzG < 0 ? '−' : '+'}${zahl} g`
}
