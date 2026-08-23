/**
 * Sprach- und Regionseinstellung.
 *
 * Ausgeliefert wird nur Deutsch – die Struktur ist aber so gelegt, dass eine
 * zweite Sprache nichts umbauen muss: Alle Datums-, Zahlen- und
 * Einheitenformate hängen an `localeTag()`, die Wocheninhalte liegen unter
 * `content/weeks/<locale>/`, und `<html lang>` kommt aus derselben Konstante.
 *
 * Bewusst nicht gemacht: die UI-Texte in Nachrichtendateien auslagern. Für
 * genau eine Sprache kostet das Lesbarkeit (`t('sleep.startedAt')` statt
 * „Schlaf gestartet") und bringt nichts. Wenn eine zweite Sprache dazukommt,
 * ist der Ort dafür hier – die Formatierungen sind dann schon in Ordnung.
 */
export const LOCALES = ['de'] as const
export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'de'

/** BCP-47-Tag je Sprache. Österreichisches Deutsch: Jänner statt Januar. */
export const LOCALE_TAG: Record<Locale, string> = { de: 'de-AT' }

export function localeTag(locale: Locale = DEFAULT_LOCALE): string {
  return LOCALE_TAG[locale]
}

/** Verzeichnisname der Inhalte zu einer Sprache. */
export function contentLocaleDir(locale: Locale = DEFAULT_LOCALE): string {
  return locale
}
