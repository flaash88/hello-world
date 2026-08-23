/**
 * Milchgebiss nach dem FDI-Schema.
 *
 * Zwanzig Zaehne, je Quadrant fuenf. Die erste Ziffer nennt den Quadranten
 * (5 = oben rechts, 6 = oben links, 7 = unten links, 8 = unten rechts – aus
 * Sicht des Kindes), die zweite die Position von der Mitte nach aussen.
 *
 * Die Durchbruchszeiten sind grobe Spannen, keine Norm. Manche Kinder haben
 * mit vier Monaten den ersten Zahn, manche mit dreizehn – beides ist normal.
 * Deshalb steht in der UI ein Zeitraum und nirgends eine Bewertung.
 *
 * Quelle der Spannen: American Dental Association, Eruption Charts
 * (Primary Teeth), abgerufen 2026-08-23. Frei zugaengliche Angaben in
 * Lebensmonaten; die Texte sind eigenstaendig formuliert.
 */

export type Kiefer = 'oben' | 'unten'
export type Seite = 'rechts' | 'links'

export type Zahn = {
  /** FDI-Nummer, z. B. "51". */
  key: string
  name: string
  kiefer: Kiefer
  /** Seite aus Sicht des Kindes. */
  seite: Seite
  /** Position von der Mitte nach aussen, 1 bis 5. */
  position: number
  /** Uebliche Durchbruchszeit in Lebensmonaten. */
  durchbruchVonMonaten: number
  durchbruchBisMonaten: number
  /** Uebliches Ausfallen in Lebensjahren. */
  ausfallVonJahren: number
  ausfallBisJahren: number
}

type Vorlage = {
  position: number
  name: string
  durchbruch: [number, number]
  ausfall: [number, number]
}

const OBEN: Vorlage[] = [
  { position: 1, name: 'Mittlerer Schneidezahn', durchbruch: [8, 12], ausfall: [6, 7] },
  { position: 2, name: 'Seitlicher Schneidezahn', durchbruch: [9, 13], ausfall: [7, 8] },
  { position: 3, name: 'Eckzahn', durchbruch: [16, 22], ausfall: [10, 12] },
  { position: 4, name: 'Erster Backenzahn', durchbruch: [13, 19], ausfall: [9, 11] },
  { position: 5, name: 'Zweiter Backenzahn', durchbruch: [25, 33], ausfall: [10, 12] },
]

const UNTEN: Vorlage[] = [
  { position: 1, name: 'Mittlerer Schneidezahn', durchbruch: [6, 10], ausfall: [6, 7] },
  { position: 2, name: 'Seitlicher Schneidezahn', durchbruch: [10, 16], ausfall: [7, 8] },
  { position: 3, name: 'Eckzahn', durchbruch: [17, 23], ausfall: [9, 12] },
  { position: 4, name: 'Erster Backenzahn', durchbruch: [14, 18], ausfall: [9, 11] },
  { position: 5, name: 'Zweiter Backenzahn', durchbruch: [23, 31], ausfall: [10, 12] },
]

/** Quadrantenziffer je Kiefer und Seite (Seite aus Sicht des Kindes). */
const QUADRANT: Record<Kiefer, Record<Seite, number>> = {
  oben: { rechts: 5, links: 6 },
  unten: { rechts: 8, links: 7 },
}

function quadrant(kiefer: Kiefer, seite: Seite, vorlagen: Vorlage[]): Zahn[] {
  return vorlagen.map((vorlage) => ({
    key: `${QUADRANT[kiefer][seite]}${vorlage.position}`,
    name: vorlage.name,
    kiefer,
    seite,
    position: vorlage.position,
    durchbruchVonMonaten: vorlage.durchbruch[0],
    durchbruchBisMonaten: vorlage.durchbruch[1],
    ausfallVonJahren: vorlage.ausfall[0],
    ausfallBisJahren: vorlage.ausfall[1],
  }))
}

export const ZAEHNE: Zahn[] = [
  ...quadrant('oben', 'rechts', OBEN),
  ...quadrant('oben', 'links', OBEN),
  ...quadrant('unten', 'rechts', UNTEN),
  ...quadrant('unten', 'links', UNTEN),
]

export const ZAHN_ANZAHL = ZAEHNE.length

const BY_KEY = new Map(ZAEHNE.map((zahn) => [zahn.key, zahn]))

export function zahnByKey(key: string): Zahn | null {
  return BY_KEY.get(key) ?? null
}

/**
 * Reihenfolge einer Zahnreihe fuer die Zeichnung: von rechts aussen ueber die
 * Mitte nach links aussen – so, wie man dem Kind in den Mund schaut.
 */
export function reihe(kiefer: Kiefer): Zahn[] {
  const rechts = ZAEHNE.filter((z) => z.kiefer === kiefer && z.seite === 'rechts')
  const links = ZAEHNE.filter((z) => z.kiefer === kiefer && z.seite === 'links')
  return [
    ...[...rechts].sort((a, b) => b.position - a.position),
    ...[...links].sort((a, b) => a.position - b.position),
  ]
}

/** Der uebliche Zeitraum, ohne Wertung. */
export function durchbruchText(zahn: Zahn): string {
  return `üblich zwischen ${zahn.durchbruchVonMonaten} und ${zahn.durchbruchBisMonaten} Monaten`
}

export function ausfallText(zahn: Zahn): string {
  return `fällt meist mit ${zahn.ausfallVonJahren} bis ${zahn.ausfallBisJahren} Jahren aus`
}
