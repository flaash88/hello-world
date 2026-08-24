/**
 * Was unter „Mehr" steht – und in welcher Reihenfolge.
 *
 * Vorher standen einundzwanzig Links in einer einzigen Spalte untereinander.
 * Das ist keine Liste mehr, das ist eine Wand: man liest sie nicht, man
 * scrollt an ihr vorbei und sucht. Deshalb zwei Änderungen:
 *
 * 1. Die Bereiche stehen als Kacheln in zwei Spalten. Halbe Höhe, und man
 *    erkennt sie am Symbol statt am Textanfang.
 * 2. Alles, was man einmal einstellt und dann jahrelang nicht mehr anfasst,
 *    liegt hinter einer einzigen Zeile („Einstellungen") statt offen da.
 *
 * Die Reihenfolge folgt dem Gebrauch im Wochenbett, nicht dem Alphabet: was
 * nachts und in den ersten Wochen gebraucht wird, steht oben.
 */

export type MenuIconKey =
  | 'notfall'
  | 'protokoll'
  | 'tagebuch'
  | 'vorrat'
  | 'wachstum'
  | 'vorsorge'
  | 'fieber'
  | 'zaehne'
  | 'wissen'
  | 'sounds'
  | 'auswertung'
  | 'entwicklung'
  | 'duplikate'

export type MenuKachel = { href: string; label: string; icon: MenuIconKey }

/**
 * Die Kacheln, in Gebrauchsreihenfolge. Was abgeschaltet ist, filtert die
 * Seite über `routeErlaubt` heraus – hier steht nur, was es überhaupt gibt.
 */
export const KACHELN: MenuKachel[] = [
  { href: '/notfall', label: 'Notfallkarte', icon: 'notfall' },
  { href: '/protokoll', label: 'Stillprotokoll', icon: 'protokoll' },
  { href: '/tagebuch', label: 'Tagebuch', icon: 'tagebuch' },
  { href: '/vorrat', label: 'Milchvorrat', icon: 'vorrat' },
  { href: '/wachstum', label: 'Wachstum', icon: 'wachstum' },
  { href: '/vorsorge', label: 'Vorsorge & Impfungen', icon: 'vorsorge' },
  { href: '/gesundheit/fieber', label: 'Fieber', icon: 'fieber' },
  { href: '/zaehne', label: 'Zähne', icon: 'zaehne' },
  { href: '/wissen', label: 'Wissen', icon: 'wissen' },
  { href: '/sounds', label: 'Einschlafgeräusche', icon: 'sounds' },
  { href: '/auswertung', label: 'Auswertung', icon: 'auswertung' },
  { href: '/entwicklung', label: 'Entwicklung', icon: 'entwicklung' },
]

export type EinstellungIconKey =
  | 'kind'
  | 'notfalldaten'
  | 'einladung'
  | 'anzeige'
  | 'benachrichtigungen'
  | 'nachtmodus'
  | 'einheiten'
  | 'export'
  | 'backup'
  | 'automationen'

export type EinstellungsGruppe = {
  titel: string
  links: { href: string; label: string; hinweis: string; icon: EinstellungIconKey }[]
}

/**
 * Die Einstellungen, auf einer eigenen Seite. Jede Zeile sagt kurz, was sie
 * betrifft – wer zum ersten Mal sucht, soll nicht raten müssen, ob „Anzeige"
 * die Schriftgröße oder den Funktionsumfang meint.
 */
export const EINSTELLUNGEN: EinstellungsGruppe[] = [
  {
    titel: 'Kind und Haushalt',
    links: [
      {
        href: '/mehr/kind',
        label: 'Kindprofil',
        hinweis: 'Name, Geburtsdatum, Geburtsgewicht',
        icon: 'kind',
      },
      {
        href: '/mehr/notfall',
        label: 'Notfalldaten',
        hinweis: 'Blutgruppe, Vorerkrankungen, Adresse, Kontakte',
        icon: 'notfalldaten',
      },
      {
        href: '/mehr/einladung',
        label: 'Zweite Person einladen',
        hinweis: 'Einladungscode erstellen',
        icon: 'einladung',
      },
    ],
  },
  {
    titel: 'Was die App tut',
    links: [
      {
        href: '/mehr/anzeige',
        label: 'Was die App anzeigt',
        hinweis: 'Umfang, Pause, zurück auf Protokoll',
        icon: 'anzeige',
      },
      {
        href: '/mehr/benachrichtigungen',
        label: 'Benachrichtigungen',
        hinweis: 'Gilt nur für dich · Ruhezeiten',
        icon: 'benachrichtigungen',
      },
      {
        href: '/mehr/nachtmodus',
        label: 'Nachtmodus',
        hinweis: 'Zeitfenster und Helligkeit',
        icon: 'nachtmodus',
      },
      {
        href: '/mehr/darstellung',
        label: 'Einheiten & Startbildschirm',
        hinweis: 'Gramm oder Unzen, was beim Öffnen kommt',
        icon: 'einheiten',
      },
    ],
  },
  {
    titel: 'Daten',
    links: [
      {
        href: '/mehr/export',
        label: 'Export',
        hinweis: 'JSON, CSV, Wochenbericht',
        icon: 'export',
      },
      {
        href: '/mehr/daten',
        label: 'Backup & Daten',
        hinweis: 'Sicherungen, alles löschen',
        icon: 'backup',
      },
      {
        href: '/mehr/integrationen',
        label: 'Automationen & API',
        hinweis: 'Home Assistant, NFC-Tags, Webhooks',
        icon: 'automationen',
      },
    ],
  },
]

/** Alle Einstellungspfade – für den Test, dass keiner verloren geht. */
export function einstellungsPfade(): string[] {
  return EINSTELLUNGEN.flatMap((gruppe) => gruppe.links.map((link) => link.href))
}
