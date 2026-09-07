/**
 * Woran die App gerade läuft – soweit es für Drucken und Herunterladen zählt.
 *
 * Hintergrund: In der vom Startbildschirm gestarteten App auf dem iPhone
 * bleibt `window.print()` wirkungslos. Es gibt dort keine Adressleiste, kein
 * Menü und kein Teilen-Blatt; der Aufruf tut schlicht nichts, ohne Fehler und
 * ohne Rückmeldung. Ein Knopf, der nichts tut, ist schlimmer als keiner –
 * deshalb wird er dort nicht angeboten, und stattdessen führt der Weg über ein
 * PDF, das der Browser in seinem Betrachter öffnet.
 *
 * Die Abfragen stehen hier als reine Funktionen über einem kleinen Abbild der
 * Browser-Umgebung, damit sie prüfbar sind.
 */

export type Umgebung = {
  /** `navigator.standalone` – gibt es nur auf iOS. */
  standalone?: boolean
  /** Trifft `(display-mode: standalone)` zu? */
  displayMode: boolean
  userAgent: string
  maxTouchPoints: number
}

export function istIOS(u: Umgebung): boolean {
  if (/iPad|iPhone|iPod/.test(u.userAgent)) return true
  // iPadOS meldet sich seit Version 13 als Macintosh; unterscheidbar ist es
  // nur daran, dass der Bildschirm mehrere Berührungen kennt.
  return u.userAgent.includes('Macintosh') && u.maxTouchPoints > 1
}

/** Läuft die App vom Startbildschirm statt im Browser? */
export function istStandalone(u: Umgebung): boolean {
  return u.standalone === true || u.displayMode
}

/** Die Kombination, in der `window.print()` nichts bewirkt. */
export function istIOSStandalone(u: Umgebung): boolean {
  return u.standalone === true || (istIOS(u) && u.displayMode)
}

/** Lohnt es sich, einen Drucken-Knopf anzubieten? */
export function druckenMoeglich(u: Umgebung): boolean {
  return !istIOSStandalone(u)
}

/** Das Abbild aus dem laufenden Browser. Nur im Browser aufrufen. */
export function umgebungAusBrowser(): Umgebung {
  const nav = window.navigator as Navigator & { standalone?: boolean }
  return {
    standalone: nav.standalone,
    displayMode: window.matchMedia('(display-mode: standalone)').matches,
    userAgent: nav.userAgent,
    maxTouchPoints: nav.maxTouchPoints ?? 0,
  }
}
