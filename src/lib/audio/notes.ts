/**
 * Tonspur-Tagebuch: Regeln und Formatierung.
 *
 * Reine Funktionen, damit sie sowohl im Browser (Aufnahme) als auch auf dem
 * Server (Upload) gelten – es waere unschoen, wenn die Aufnahme drei Minuten
 * zulaesst und der Server bei zwei abbricht.
 */

/** Laenger als drei Minuten hoert sich hinterher niemand an. */
export const MAX_DAUER_SEK = 180
/** Ab hier warnt die App vor dem Hochladen – unterwegs zaehlt jedes Megabyte. */
export const WARNUNG_AB_BYTES = 5 * 1024 * 1024
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024

/** Zielformat: Opus in Ogg, 64 kbit/s, mono – klein und ueberall abspielbar. */
export const ZIEL_BITRATE_KBPS = 64
export const ZIEL_MIME = 'audio/ogg'
export const ZIEL_ENDUNG = 'opus'

/** So viele Ausschlaege bekommt die Wellenform – genug fuers Auge, wenig Daten. */
export const WELLENFORM_PUNKTE = 96

/** Formate, die hochgeladen werden duerfen. */
export const UPLOAD_FORMATE = ['mp3', 'm4a', 'wav', 'ogg', 'flac'] as const
export type UploadFormat = (typeof UPLOAD_FORMATE)[number]

export const TON_TAGS = [
  'lachen',
  'brabbeln',
  'erstes-wort',
  'singen',
  'weinen',
  'schnaufen',
  'alltag',
] as const
export type TonTag = (typeof TON_TAGS)[number]

export const TON_TAG_LABEL: Record<TonTag, string> = {
  lachen: 'Lachen',
  brabbeln: 'Brabbeln',
  'erstes-wort': 'Erstes Wort',
  singen: 'Singen',
  weinen: 'Weinen',
  schnaufen: 'Schnaufen',
  alltag: 'Alltag',
}

/** Nimmt nur bekannte Tags an und wirft Doppelte weg. */
export function normalisiereTags(input: unknown): TonTag[] {
  if (!Array.isArray(input)) return []
  const erlaubt = new Set<string>(TON_TAGS)
  const gesehen = new Set<string>()
  const out: TonTag[] = []
  for (const entry of input) {
    if (typeof entry !== 'string') continue
    const tag = entry.trim().toLowerCase()
    if (!erlaubt.has(tag) || gesehen.has(tag)) continue
    gesehen.add(tag)
    out.push(tag as TonTag)
  }
  return out
}

/** "1:04" – die Laenge einer Aufnahme, nie laenger als drei Minuten. */
export function dauerText(sekunden: number | null): string {
  if (sekunden === null || !Number.isFinite(sekunden)) return '–:––'
  const gesamt = Math.max(0, Math.round(sekunden))
  return `${Math.floor(gesamt / 60)}:${String(gesamt % 60).padStart(2, '0')}`
}

/** "1,4 MB" – fuer die Warnung vor grossen Uploads. */
export function groesseText(bytes: number, locale = 'de-AT'): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} kB`
  return `${(bytes / 1024 / 1024).toLocaleString(locale, { maximumFractionDigits: 1 })} MB`
}

export function istGross(bytes: number): boolean {
  return bytes > WARNUNG_AB_BYTES
}

/** Titelvorschlag, wenn niemand einen eintippt. */
export function titelVorschlag(datum: Date, locale = 'de-AT', tz = 'Europe/Vienna'): string {
  const formatiert = new Intl.DateTimeFormat(locale, {
    timeZone: tz,
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(datum)
  return `Aufnahme ${formatiert}`
}

export type TonFilter = { tag?: TonTag | null; suche?: string }

export type FilterbareNotiz = { title: string; tags: unknown }

/** Filtert nach Tag und freiem Text – beides zusammen wirkt als „und". */
export function filtere<T extends FilterbareNotiz>(notizen: T[], filter: TonFilter): T[] {
  const suche = filter.suche?.trim().toLowerCase() ?? ''
  return notizen.filter((notiz) => {
    if (filter.tag && !normalisiereTags(notiz.tags).includes(filter.tag)) return false
    if (suche && !notiz.title.toLowerCase().includes(suche)) return false
    return true
  })
}
