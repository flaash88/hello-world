/**
 * Notfallkarte.
 *
 * Alles auf dieser Karte kommt aus Quellen, die es schon gibt: Allergien und
 * Dauermedikamente aus der Gesundheitskategorie, das Gewicht aus den
 * Wachstumsmessungen, die Impfungen aus der Vorsorge. Neu gepflegt werden nur
 * Blutgruppe, Vorerkrankungen, Kontakte und Adresse – alles andere waere ein
 * zweiter Ort fuer dieselben Daten, und der ist im Notfall schlimmer als
 * keiner: irgendwann stimmt einer von beiden nicht mehr.
 *
 * Die App leitet aus dem Gewicht nichts ab und rechnet nichts aus. Es steht
 * dort, weil Rettung und Aerztin danach fragen.
 */

/**
 * Nummern, die nicht geloescht werden koennen. Oesterreich.
 *
 * Die Zuordnung ist nicht geraten: sie folgt der Beschreibung der jeweiligen
 * Stelle (Quellen in `NOTRUF_QUELLE`). Besonders die
 * Vergiftungsinformationszentrale ist eng zustaendig – fuer den *Verdacht auf
 * Vergiftung*, nicht fuer einen verschluckten Fremdkoerper. Wer sich verschluckt
 * und keine Luft bekommt, braucht 144, nicht eine Beratung. Die Abgrenzung
 * steht deshalb im Hinweis, nicht als Nebensatz irgendwo anders.
 */
export const NOTRUFE = [
  {
    key: 'rettung',
    name: 'Rettung',
    nummer: '144',
    hinweis: 'Lebensgefahr, Atemnot, Ersticken, Bewusstlosigkeit, Krampfanfall',
    dringend: true,
  },
  {
    key: 'vergiftung',
    name: 'Vergiftungsinformationszentrale',
    nummer: '01 406 43 43',
    hinweis:
      'Verdacht auf Vergiftung: Medikamente, Putz- und Haushaltsmittel, Pflanzen, Pilze. Rund um die Uhr. Bei Atemnot oder Bewusstlosigkeit zuerst 144.',
    dringend: true,
  },
  {
    key: 'gesundheitsnummer',
    name: 'Gesundheitsnummer 1450',
    nummer: '1450',
    hinweis: 'Beschwerden, die kein Notfall sind. Rund um die Uhr, kostenlos.',
    dringend: false,
  },
] as const

/**
 * Woher die Nummern und ihre Zuordnung stammen. Steht sichtbar auf der Karte,
 * damit sich das nachlesen laesst, statt uns glauben zu muessen.
 */
export const NOTRUF_QUELLE = {
  text: 'Nummern und Zuständigkeiten nach Gesundheit Österreich GmbH (Vergiftungsinformationszentrale) und dem Gesundheitsportal des Sozialministeriums.',
  stand: '2026-08',
} as const

export const KONTAKT_ROLLEN = ['kinderarzt', 'hebamme', 'klinik', 'frei'] as const
export type KontaktRolle = (typeof KONTAKT_ROLLEN)[number]

export const KONTAKT_ROLLE_LABEL: Record<KontaktRolle, string> = {
  kinderarzt: 'Kinderärztin',
  hebamme: 'Hebamme',
  klinik: 'Kinderklinik',
  frei: 'Weiterer Kontakt',
}

/** Vorgeschlagene Belegung – zwei freie Plaetze am Ende. */
export const KONTAKT_VORLAGE: KontaktRolle[] = ['kinderarzt', 'hebamme', 'klinik', 'frei', 'frei']

export type Kontakt = {
  id: string
  rolle: KontaktRolle
  name: string
  nummer: string
}

export type Impfzeile = { titel: string; datum: string }

export type NotfallKarte = {
  /** Zeitpunkt, zu dem die Karte gebaut wurde – fuer "Stand" im Offlinefall. */
  stand: string
  kind: {
    name: string
    geburtsdatum: string | null
    alter: string | null
    gewicht: string | null
    gewichtVom: string | null
    blutgruppe: string | null
    allergien: string[]
    dauermedikamente: string[]
    vorerkrankungen: string | null
  }
  adresse: string | null
  kontakte: Kontakt[]
  /** Die letzten dokumentierten Impfungen, chronologisch, ohne Bewertung. */
  impfungen: Impfzeile[]
}

/** Telefonnummer als `tel:`-Ziel: alles weg, was nicht waehlbar ist. */
export function telHref(nummer: string): string {
  const sauber = nummer.replace(/[^\d+]/g, '')
  return `tel:${sauber}`
}

/** Nimmt eine Rolle nur an, wenn sie bekannt ist. */
export function istKontaktRolle(value: string): value is KontaktRolle {
  return (KONTAKT_ROLLEN as readonly string[]).includes(value)
}

export type HealthEintrag = {
  kind?: string
  allergy?: string
  medication?: string
  dauerhaft?: boolean
}

/**
 * Allergien aus den Gesundheitseintraegen. Doppelte werden zusammengefasst –
 * wer dieselbe Allergie zweimal eintraegt, hat sie trotzdem nur einmal.
 */
export function allergienAus(eintraege: readonly HealthEintrag[]): string[] {
  return eindeutig(
    eintraege
      .filter((eintrag) => eintrag.kind === 'allergy')
      .map((eintrag) => eintrag.allergy?.trim() ?? ''),
  )
}

/** Alles, was als Dauermedikament markiert wurde. */
export function dauermedikamenteAus(eintraege: readonly HealthEintrag[]): string[] {
  return eindeutig(
    eintraege
      .filter((eintrag) => eintrag.kind === 'medication' && eintrag.dauerhaft === true)
      .map((eintrag) => eintrag.medication?.trim() ?? ''),
  )
}

function eindeutig(werte: string[]): string[] {
  const gesehen = new Set<string>()
  const out: string[] = []
  for (const wert of werte) {
    if (!wert) continue
    const key = wert.toLowerCase()
    if (gesehen.has(key)) continue
    gesehen.add(key)
    out.push(wert)
  }
  return out
}

/** Ist ueberhaupt etwas hinterlegt, das im Notfall hilft? */
export function istBefuellt(karte: NotfallKarte): boolean {
  return (
    karte.kontakte.length > 0 ||
    karte.adresse !== null ||
    karte.kind.blutgruppe !== null ||
    karte.kind.allergien.length > 0 ||
    karte.kind.dauermedikamente.length > 0
  )
}
