/**
 * Bilder im Browser verkleinern, bevor sie hochgeladen werden.
 *
 * Ein Foto vom Handy hat vier bis acht Megabyte. Der Server rechnet es
 * ohnehin auf 2048 Pixel herunter und wirft die EXIF-Daten weg – hochgeladen
 * wurde bisher trotzdem das Original. Über WLAN merkt man das nicht, über
 * Mobilfunk und einen Tunnel dauert es lange genug, dass die Verbindung
 * abbricht, bevor das Bild ankommt.
 *
 * Deshalb wird schon hier verkleinert: gleiche Kantenlänge wie am Server, also
 * kein Qualitätsverlust gegenüber dem, was am Ende gespeichert wird, aber
 * typischerweise ein Zehntel der Datenmenge.
 *
 * Reine Browser-Funktion. Wo `createImageBitmap` oder Canvas fehlen – oder das
 * Format der Browser nicht kennt, etwa HEIC auf einem alten Android – wird die
 * Originaldatei zurückgegeben. Lieber langsam hochladen als gar nicht.
 */

/** Längste Kante. Gleich wie `MAX_EDGE` in `lib/media/storage.ts`. */
export const MAX_KANTE = 2048
/** Darunter lohnt das Umkodieren nicht. */
export const MINDESTGROESSE_BYTES = 512 * 1024
const QUALITAET = 0.82

export type VerkleinerungsErgebnis = {
  datei: File
  /** Wurde tatsaechlich verkleinert? */
  verkleinert: boolean
  /** Ausgangsgroesse in Bytes – fuer die Rueckmeldung an die Nutzerin. */
  vorherBytes: number
}

/**
 * Zielgröße bei gleichbleibendem Seitenverhältnis. Vergrößert nie.
 */
export function zielMasse(
  breite: number,
  hoehe: number,
  maxKante = MAX_KANTE,
): { breite: number; hoehe: number } {
  const laengste = Math.max(breite, hoehe)
  if (laengste <= maxKante || laengste === 0) return { breite, hoehe }
  const faktor = maxKante / laengste
  return {
    breite: Math.max(1, Math.round(breite * faktor)),
    hoehe: Math.max(1, Math.round(hoehe * faktor)),
  }
}

/**
 * Lohnt das Umkodieren? Kleine Dateien und alles, was kein Bild ist, bleiben
 * unangetastet. Bei SVG und GIF gibt Canvas etwas anderes zurück als das
 * Original (Animation weg), deshalb bleiben die außen vor.
 */
export function lohntVerkleinern(datei: File): boolean {
  if (!datei.type.startsWith('image/')) return false
  if (datei.type === 'image/gif' || datei.type === 'image/svg+xml') return false
  return datei.size >= MINDESTGROESSE_BYTES
}

export async function verkleinereBild(
  datei: File,
  maxKante = MAX_KANTE,
): Promise<VerkleinerungsErgebnis> {
  const unveraendert: VerkleinerungsErgebnis = {
    datei,
    verkleinert: false,
    vorherBytes: datei.size,
  }
  if (!lohntVerkleinern(datei)) return unveraendert
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') {
    return unveraendert
  }

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(datei)
  } catch {
    // Format, das der Browser nicht dekodieren kann (z. B. HEIC auf Android).
    return unveraendert
  }

  try {
    const { breite, hoehe } = zielMasse(bitmap.width, bitmap.height, maxKante)
    const canvas = document.createElement('canvas')
    canvas.width = breite
    canvas.height = hoehe
    const ctx = canvas.getContext('2d')
    if (!ctx) return unveraendert
    ctx.drawImage(bitmap, 0, 0, breite, hoehe)

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', QUALITAET)
    })
    // Wenn das Ergebnis nicht kleiner ist, war der Umweg sinnlos.
    if (!blob || blob.size >= datei.size) return unveraendert

    const name = datei.name.replace(/\.[^.]+$/, '') || 'foto'
    return {
      datei: new File([blob], `${name}.jpg`, { type: 'image/jpeg', lastModified: datei.lastModified }),
      verkleinert: true,
      vorherBytes: datei.size,
    }
  } finally {
    bitmap.close()
  }
}

/** Menschenlesbare Größe für Fehlermeldungen. */
export function groesseText(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} kB`
}
