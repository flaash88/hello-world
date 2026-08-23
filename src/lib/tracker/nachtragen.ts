import { formatTime, zonedParts, zonedTimeToUtc } from '@/lib/time'
import type { EventType } from '@/lib/events/types'

/**
 * Nachtragen ohne Zeitwähler.
 *
 * Nachts merkt man sich „vor zwei Stunden" oder „halb drei", nicht 02:30 auf
 * einem Rädchen. Beides soll die App verstehen, und zwar in derselben Zeile.
 *
 * Nachgetragene Einträge werden bewusst nicht markiert: ob etwas sofort oder
 * eine Stunde später erfasst wurde, ändert nichts daran, dass es stattgefunden
 * hat. Eine Kennzeichnung würde nur eine zweite Klasse von Einträgen schaffen.
 */

/** Ausgeschriebene Minutenangaben, wie man sie tatsächlich tippt. */
const HALB: Record<string, number> = {
  viertel: 15,
  halb: 30,
  dreiviertel: 45,
}

const EINHEITEN: { muster: RegExp; minuten: number }[] = [
  { muster: /^(stunden?|std|h)$/i, minuten: 60 },
  { muster: /^(minuten?|min|m)$/i, minuten: 1 },
]

function zahlAus(text: string): number | null {
  const worte: Record<string, number> = {
    einer: 1,
    einem: 1,
    eine: 1,
    einen: 1,
    ein: 1,
    zwei: 2,
    drei: 3,
    vier: 4,
    fünf: 5,
    fuenf: 5,
    sechs: 6,
    sieben: 7,
    acht: 8,
    neun: 9,
    zehn: 10,
    elf: 11,
    zwölf: 12,
    zwoelf: 12,
    halben: 0.5,
    halber: 0.5,
  }
  const normalisiert = text.trim().toLowerCase().replace(',', '.')
  if (normalisiert in worte) return worte[normalisiert] as number
  const zahl = Number(normalisiert)
  return Number.isFinite(zahl) ? zahl : null
}

/**
 * „vor 2 Stunden", „vor einer halben Stunde", „vor 20 min" – relativ zu jetzt.
 * Gibt `null` zurück, wenn die Eingabe nicht so gemeint war.
 */
export function relativeZeit(eingabe: string, jetzt: Date): Date | null {
  const treffer = /^\s*vor\s+(.+?)\s*$/i.exec(eingabe)
  if (!treffer) return null
  const rest = (treffer[1] ?? '').trim()

  // "einer halben Stunde" – die Zahl steckt im Bruch.
  const halbe = /^(?:einer?\s+)?halben?\s+(stunde|std|h)$/i.exec(rest)
  if (halbe) return new Date(jetzt.getTime() - 30 * 60_000)

  const teile = /^(.+?)\s+([a-zäöü]+)\.?$/i.exec(rest)
  if (!teile) return null
  const menge = zahlAus(teile[1] ?? '')
  if (menge === null) return null
  const einheit = EINHEITEN.find((e) => e.muster.test(teile[2] ?? ''))
  if (!einheit) return null

  const minuten = menge * einheit.minuten
  if (minuten <= 0 || minuten > 48 * 60) return null
  return new Date(jetzt.getTime() - Math.round(minuten) * 60_000)
}

/**
 * Eine Uhrzeit, wie man sie sagt: „2:30", „02:30", „halb drei", „viertel vor
 * acht", „14 Uhr". Das Ergebnis liegt immer in der Vergangenheit – wer nachts
 * „halb drei" eintippt, meint die letzte halbe drei, nicht die nächste.
 */
export function uhrzeitEingabe(eingabe: string, jetzt: Date, timezone: string): Date | null {
  const text = eingabe.trim().toLowerCase()
  if (!text) return null

  const digital = /^(\d{1,2})[:.](\d{2})$/.exec(text)
  if (digital) {
    return ausStunden(Number(digital[1]), Number(digital[2]), jetzt, timezone)
  }

  const nurStunde = /^(\d{1,2})(?:\s*uhr)?$/.exec(text)
  if (nurStunde) {
    return ausStunden(Number(nurStunde[1]), 0, jetzt, timezone)
  }

  // "viertel vor acht", "dreiviertel acht", "halb drei"
  const gesprochen = /^(viertel|halb|dreiviertel)\s+(?:(vor|nach)\s+)?([a-zäöü]+|\d{1,2})$/.exec(text)
  if (gesprochen) {
    const stufe = HALB[gesprochen[1] as string] as number
    const richtung = gesprochen[2]
    const bezug = zahlAus(gesprochen[3] ?? '')
    if (bezug === null) return null

    if (richtung === 'nach') return ausStunden(bezug, stufe, jetzt, timezone)
    if (richtung === 'vor') return ausStunden(bezug - 1, 60 - stufe, jetzt, timezone)
    // Ohne "vor"/"nach" ist die genannte Stunde das Ziel: "halb drei" = 2:30.
    return ausStunden(bezug - 1, stufe, jetzt, timezone)
  }

  return null
}

/**
 * Baut aus Stunde und Minute den letzten Zeitpunkt vor `jetzt`. Bei einer
 * 12-Stunden-Angabe wird auch die Nachmittagsvariante geprueft – „halb drei"
 * um 20 Uhr meint 14:30, nicht 2:30 heute Nacht.
 */
function ausStunden(stunde: number, minute: number, jetzt: Date, timezone: string): Date | null {
  if (!Number.isFinite(stunde) || !Number.isFinite(minute)) return null
  const h = ((Math.round(stunde) % 24) + 24) % 24
  if (minute < 0 || minute > 59) return null

  // Eine Angabe unter 12 kann beides meinen. Beide Lesarten kommen in den Topf,
  // gewonnen hat der spaeteste Zeitpunkt, der noch in der Vergangenheit liegt.
  const stunden = h < 12 ? [h + 12, h] : [h]
  const heute = zonedParts(jetzt, timezone)

  let bester: Date | null = null
  for (const kandidat of stunden) {
    for (const tageZurueck of [0, 1]) {
      // Ueber zonedTimeToUtc statt Millisekunden-Arithmetik: sonst liegt der
      // Zeitpunkt an einem Umstellungstag um eine Stunde daneben.
      const zeit = zonedTimeToUtc(
        {
          year: heute.year,
          month: heute.month,
          day: heute.day - tageZurueck,
          hour: kandidat,
          minute,
        },
        timezone,
      )
      if (zeit.getTime() > jetzt.getTime()) continue
      if (!bester || zeit.getTime() > bester.getTime()) bester = zeit
    }
  }
  return bester
}

/**
 * Beide Schreibweisen in einer Zeile. Erst relativ, dann als Uhrzeit – so
 * muss niemand vorher entscheiden, wie er es meint.
 */
export function zeitEingabe(eingabe: string, jetzt: Date, timezone: string): Date | null {
  return relativeZeit(eingabe, jetzt) ?? uhrzeitEingabe(eingabe, jetzt, timezone)
}

/** Wie ein erkannter Zeitpunkt zurueckgemeldet wird. */
export function zeitBestaetigung(zeit: Date, jetzt: Date, timezone: string): string {
  const minuten = Math.round((jetzt.getTime() - zeit.getTime()) / 60_000)
  const uhr = formatTime(zeit, timezone)
  if (minuten < 1) return uhr
  if (minuten < 60) return `${uhr} · vor ${minuten} Min`
  const stunden = Math.floor(minuten / 60)
  const rest = minuten % 60
  return `${uhr} · vor ${stunden} Std${rest > 0 ? ` ${rest} Min` : ''}`
}

// ------------------------------------------------------------- Vorschlaege --

export type LetzterWert = { type: EventType; payload: unknown; startedAt: Date }

/**
 * Ein Ein-Tap-Vorschlag entsteht nur, wenn dasselbe zuletzt mehrfach gleich
 * war. Zwei verschiedene Mengen hintereinander sind kein Muster, sondern
 * Zufall – dann gibt es keinen Vorschlag und das Feld bleibt leer.
 */
export const VORSCHLAG_AB_TREFFERN = 3

export function haeufigsterWert<T>(werte: T[], mindestens = VORSCHLAG_AB_TREFFERN): T | null {
  if (werte.length < mindestens) return null
  const letzte = werte.slice(0, mindestens)
  const erster = letzte[0]
  return letzte.every((wert) => wert === erster) ? (erster as T) : null
}

/**
 * Vorschlag fuer die Flaschenmenge: nur wenn die letzten drei Flaschen
 * dieselbe Menge hatten.
 */
export function mengenVorschlag(letzteMengen: (number | null)[]): number | null {
  const gefiltert = letzteMengen.filter((wert): wert is number => typeof wert === 'number')
  return haeufigsterWert(gefiltert)
}

/** Die vier Kategorien, die im Nachtrag-Blatt immer oben stehen. */
export const NACHTRAG_TYPEN: EventType[] = ['nursing', 'bottle', 'diaper', 'sleep']
