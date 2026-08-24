/**
 * Eine Datei an das Teilen-Blatt des Geräts geben.
 *
 * Warum überhaupt: In der vom Startbildschirm gestarteten App gibt es keine
 * Bedienleiste. Ein Link mit `target="_blank"` öffnet die Seite dort innerhalb
 * der App – das PDF steht dann bildschirmfüllend da, ohne Teilen, ohne
 * Drucken, ohne Zurück. Das Teilen-Blatt ist der einzige Weg, auf dem eine
 * Datei die App verlässt.
 *
 * Die Abfragen stehen als reine Funktionen über einem kleinen Abbild von
 * `navigator`, damit sie prüfbar sind.
 */

export type Teiler = {
  canShare?: (daten: { files?: File[] }) => boolean
  share?: (daten: { files?: File[] }) => Promise<void>
}

/** Kann dieser Browser eine PDF-Datei weitergeben? */
export function kannPdfTeilen(nav: Teiler): boolean {
  if (typeof nav.canShare !== 'function' || typeof nav.share !== 'function') return false
  try {
    const probe = new File([new Blob([], { type: 'application/pdf' })], 'probe.pdf', {
      type: 'application/pdf',
    })
    return nav.canShare({ files: [probe] })
  } catch {
    return false
  }
}

/**
 * Dateiname aus dem `Content-Disposition`-Kopf. Der Name steht im Teilen-Blatt
 * und später in „Dateien" – „download.pdf" hilft dort niemandem.
 */
export function dateinameAus(disposition: string | null, ersatz: string): string {
  if (!disposition) return ersatz
  const treffer = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition)
  if (!treffer?.[1]) return ersatz
  try {
    return decodeURIComponent(treffer[1])
  } catch {
    return treffer[1]
  }
}

export type TeilAusgang = 'abgebrochen' | 'nochmal' | 'fehler'

/**
 * Was ein Fehlschlag beim Teilen bedeutet.
 *
 * `AbortError` heißt: Das Blatt war offen und wurde geschlossen – kein Fehler,
 * eine Entscheidung.
 *
 * `NotAllowedError` heißt fast immer: Zwischen dem Antippen und dem Aufruf lag
 * das Laden des PDFs, und darüber ist die Nutzergeste verfallen. Beim zweiten
 * Antippen liegt die Datei bereit und es klappt sofort – deshalb ist die
 * Antwort darauf eine Bitte, nicht eine Fehlermeldung.
 */
export function teilAusgang(fehler: unknown): TeilAusgang {
  const name = fehler instanceof Error ? fehler.name : ''
  if (name === 'AbortError') return 'abgebrochen'
  if (name === 'NotAllowedError' || name === 'InvalidStateError') return 'nochmal'
  return 'fehler'
}
