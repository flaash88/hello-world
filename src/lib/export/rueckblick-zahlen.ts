/**
 * „Das Jahr in Zahlen" – die Kacheln über dem Rückblick.
 *
 * Reine Rechnung, ohne Datenbank: Bildschirm und PDF sollen dieselben Zahlen
 * zeigen, und das lässt sich nur prüfen, wenn die Rechnung für sich steht.
 */

/** Nur das, was für die Zahlen zählt – die Abfrage liefert mehr. */
export type ZahlenEingabe = {
  eintraege: { media: unknown[] }[]
  meilensteine: unknown[]
  toene: unknown[]
  messungen: { weightKg: number | null; lengthCm: number | null }[]
}

/** Die Kacheln aus „Das Jahr in Zahlen" als Label-Wert-Paare. */
export function rueckblickZahlen(
  daten: ZahlenEingabe,
  formatiere: {
    gewicht: (kg: number) => string
    laenge: (cm: number) => string
  },
): [string, string][] {
  // Erst ab zwei Messungen gibt es eine Zunahme. Bei einer einzigen waeren
  // erste und letzte dieselbe, und dann staende dort „+0,0 kg" – eine Zahl,
  // die etwas behauptet, was niemand gemessen hat.
  const zwei = daten.messungen.length >= 2
  const erste = zwei ? daten.messungen[0] : undefined
  const letzte = zwei ? daten.messungen[daten.messungen.length - 1] : undefined

  const zahlen: [string, string][] = [
    ['Tagebucheinträge', String(daten.eintraege.length)],
    ['Meilensteine', String(daten.meilensteine.length)],
    ['Aufnahmen', String(daten.toene.length)],
    ['Fotos', String(daten.eintraege.reduce((summe, e) => summe + e.media.length, 0))],
  ]

  if (erste && letzte && erste.weightKg !== null && letzte.weightKg !== null) {
    zahlen.push(['Gewicht', `+${formatiere.gewicht(letzte.weightKg - erste.weightKg)}`])
  }
  if (erste && letzte && erste.lengthCm !== null && letzte.lengthCm !== null) {
    zahlen.push(['Gewachsen', `+${formatiere.laenge(letzte.lengthCm - erste.lengthCm)}`])
  }

  return zahlen
}
