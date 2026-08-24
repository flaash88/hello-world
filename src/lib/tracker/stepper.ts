/**
 * Rechnen für die Zahleneingabe mit Plus und Minus.
 *
 * Steht hier und nicht in der Komponente, damit es prüfbar ist – der Fehler,
 * der diesen Baustein nötig gemacht hat, war genau so einer: Wer „38" tippte,
 * bekam 45. Die erste Ziffer wurde sofort auf das Minimum hochgezogen, die
 * zweite lief damit ins Maximum.
 */

/** Wie lange gehalten werden muss, bis die Zahl von selbst weiterläuft. */
export const HALTEN_BIS_MS = 400
/** Takt der Wiederholung danach. */
export const WIEDERHOLUNG_MS = 90
/** Ab dieser Wiederholung wird es schneller. */
export const SCHNELL_AB = 8
/** Um so viel größer sind die Schritte danach. */
export const SCHNELL_FAKTOR = 5

/**
 * Schrittweite für die n-te Wiederholung. Am Anfang fein, damit man einen
 * einzelnen Schritt noch trifft; danach grob, damit 36 auf 40 Grad keine
 * vierzig Taps braucht.
 */
export function schrittFuer(wiederholung: number, schritt: number): number {
  return wiederholung < SCHNELL_AB ? schritt : schritt * SCHNELL_FAKTOR
}

/** Nächster Wert, auf zwei Nachkommastellen gerundet und begrenzt. */
export function naechsterWert(
  aktuell: number | null,
  delta: number,
  min: number,
  max: number,
): number {
  const roh = (aktuell ?? 0) + delta
  const gerundet = Math.round(roh * 100) / 100
  return Math.min(max, Math.max(min, gerundet))
}

/**
 * Was im Feld steht, als Zahl. `null` heißt: leer oder (noch) keine Zahl –
 * beides ist beim Tippen ein gültiger Zwischenstand.
 */
export function ausEingabe(text: string): number | null {
  const sauber = text.trim().replace(',', '.')
  if (sauber === '') return null
  const zahl = Number(sauber)
  return Number.isFinite(zahl) ? zahl : null
}

/** Zahl fürs Feld, mit Komma statt Punkt. */
export function alsEingabe(wert: number | null): string {
  return wert === null ? '' : String(wert).replace('.', ',')
}

/**
 * Wird beim Verlassen des Feldes angewandt: Erst hier darf begrenzt werden,
 * nicht bei jedem Tastendruck.
 */
export function beimVerlassen(
  wert: number | null,
  min: number,
  max: number,
): number | null {
  if (wert === null) return null
  return naechsterWert(0, wert, min, max)
}
