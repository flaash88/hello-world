/**
 * Aufnahmezeitpunkt aus EXIF-Daten.
 *
 * Bewusst ein Textmuster statt eines EXIF-Parsers: Die Datumsfelder haben in
 * jeder Kamera dasselbe Format `YYYY:MM:DD HH:MM:SS`, und ein vollständiger
 * Parser wäre für diese einzige Angabe unverhältnismäßig.
 *
 * Wird von beiden Seiten benutzt: der Server liest den EXIF-Block über sharp,
 * der Browser durchsucht die ersten Kilobyte der Datei selbst – denn beim
 * Verkleinern vor dem Upload gehen die EXIF-Daten verloren, und das
 * Aufnahmedatum soll trotzdem als Vorschlag ankommen.
 */

/** So weit wird im Dateikopf gesucht. Der EXIF-Block steht immer am Anfang. */
export const EXIF_SUCHFENSTER_BYTES = 256 * 1024

/**
 * Findet das erste plausible Datum in einem Text. Gibt `null` zurück, wenn
 * keines drinsteht oder es offensichtlich falsch ist.
 *
 * Die Zeit gilt als Ortszeit der Kamera – eine Zeitzone steht in den
 * Standardfeldern nicht, und sie zu erfinden wäre schlimmer als sie
 * weglassen.
 */
export function aufnahmezeitAus(text: string, jetzt: Date = new Date()): Date | null {
  const match = /(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/.exec(text)
  if (!match) return null

  const [, year, month, day, hour, minute, second] = match
  const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  )
  if (Number.isNaN(date.getTime())) return null
  // Kameras ohne gestellte Uhr liefern 1970 oder 2000-01-01; Datumsangaben in
  // der Zukunft sind ebenso wertlos.
  if (date.getFullYear() < 1990) return null
  if (date.getTime() > jetzt.getTime() + 86_400_000) return null
  return date
}

/**
 * Sucht das Aufnahmedatum im Kopf einer Bilddatei. Läuft im Browser und
 * verändert die Datei nicht.
 */
export async function aufnahmezeitAusDatei(
  datei: Blob,
  jetzt: Date = new Date(),
): Promise<Date | null> {
  try {
    const kopf = datei.slice(0, Math.min(datei.size, EXIF_SUCHFENSTER_BYTES))
    const bytes = await alsBytes(kopf)
    if (!bytes) return null
    // latin1: jedes Byte wird ein Zeichen. Für die Zifferngruppen genügt das,
    // und es kann – anders als UTF-8 – nicht an ungültigen Sequenzen scheitern.
    let text = ''
    for (let i = 0; i < bytes.length; i++) text += String.fromCharCode(bytes[i] as number)
    return aufnahmezeitAus(text, jetzt)
  } catch {
    return null
  }
}

/**
 * Bytes eines Blobs. `Blob.arrayBuffer` gibt es erst ab Safari 14 – auf
 * aelteren iPhones und in jsdom fehlt es, dort uebernimmt `FileReader`.
 */
async function alsBytes(blob: Blob): Promise<Uint8Array | null> {
  if (typeof blob.arrayBuffer === 'function') {
    return new Uint8Array(await blob.arrayBuffer())
  }
  if (typeof FileReader !== 'function') return null
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () =>
      resolve(
        reader.result instanceof ArrayBuffer ? new Uint8Array(reader.result) : null,
      )
    reader.onerror = () => resolve(null)
    reader.readAsArrayBuffer(blob)
  })
}
