/**
 * Farbe der Systemleiste (`theme-color`).
 *
 * Auf dem iPhone faerbt iOS damit den Streifen hinter Uhrzeit und Dynamic
 * Island. Die Werte muessen exakt dem Seitenhintergrund entsprechen, sonst
 * steht dort eine feine Kante statt einer durchgehenden Flaeche.
 *
 * Wichtig zur Einordnung: In der vom Startbildschirm gestarteten App richtet
 * sich iOS nach der **System**-Darstellung, nicht nach dem Nachtmodus dieser
 * App. Wer das iPhone auf Hell stehen hat und hier den Nachtmodus einschaltet,
 * behaelt oben einen hellen Streifen – dagegen hilft nur die Systemeinstellung.
 * Die Werte hier sorgen dafuer, dass es ueberall sonst stimmt und dass vor dem
 * ersten Skriptlauf schon die richtige Variante steht.
 */

/** Entspricht `--background` im Tagesthema (36 44% 97%). */
export const LEISTE_TAG = '#fbf8f4'
/** Entspricht `--background` im Nachtthema (20 18% 4%). */
export const LEISTE_NACHT = '#0c0a08'

export function leistenfarbe(thema: 'day' | 'night'): string {
  return thema === 'night' ? LEISTE_NACHT : LEISTE_TAG
}

/**
 * Setzt alle `theme-color`-Marken auf dieselbe Farbe.
 *
 * Es gibt mehrere davon – je eine fuer helle und dunkle Systemdarstellung,
 * damit vor dem ersten Skriptlauf schon die passende gilt. Sobald die App
 * selbst entschieden hat, gewinnt ihre Entscheidung, und dafuer muessen alle
 * gesetzt werden: Eine Marke mit passendem `media` schlaegt sonst die ohne.
 */
export function setzeLeistenfarbe(thema: 'day' | 'night', dokument: Document): void {
  const farbe = leistenfarbe(thema)
  for (const marke of dokument.querySelectorAll('meta[name="theme-color"]')) {
    marke.setAttribute('content', farbe)
  }
}
