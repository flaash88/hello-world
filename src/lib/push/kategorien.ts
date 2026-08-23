/**
 * Was aufs Handy darf – und was nie.
 *
 * Diese Liste ist eine Erlaubnisliste, keine Sperrliste: `darfSenden` gibt
 * `false` zurueck, sobald eine Kategorie hier nicht steht. Wer spaeter eine
 * neue Benachrichtigung einbaut, muss sie bewusst eintragen und dabei
 * begruenden, warum sie kein Nagen ist.
 *
 * Nicht eingetragen und damit nie versendbar sind insbesondere:
 * - Aufforderungen, jetzt schlafen zu legen oder etwas einzutragen
 * - Zusammenfassungen, Wochenrueckblicke, "so lief eure Woche"
 * - alles, was von selbst auslöst und keinen Termin betrifft
 *
 * Die vier erlaubten Zusatzkategorien haengen an etwas, das die Eltern selbst
 * eingetragen haben: ein Medikamenten-Intervall, ein Beutel im Gefrierfach,
 * eine Nachtschicht, ein Schlaffenster aus den eigenen Daten.
 */

export const PUSH_KATEGORIEN = [
  'termin',
  'schlaffenster',
  'medikament',
  'vorrat',
  'nachtschicht',
  'system',
] as const

export type PushKategorie = (typeof PUSH_KATEGORIEN)[number]

export type PushKategorieInfo = {
  key: PushKategorie
  label: string
  hint: string
  /** Feld in `NotificationPreference`, das sie einschaltet. */
  feld: PrefFeld | null
  /** Ist sie ab Werk an? */
  standard: boolean
}

export type PrefFeld =
  | 'appointmentAlerts'
  | 'sleepWindowAlerts'
  | 'medicationAlerts'
  | 'milkStockAlerts'
  | 'nightShiftAlerts'

export const PUSH_KATEGORIEN_INFO: Record<PushKategorie, PushKategorieInfo> = {
  termin: {
    key: 'termin',
    label: 'Fristen im Eltern-Kind-Pass',
    hint: 'Wenn ein Untersuchungsfenster aufgeht oder zugeht.',
    feld: 'appointmentAlerts',
    standard: true,
  },
  schlaffenster: {
    key: 'schlaffenster',
    label: 'Schlaffenster',
    hint: 'Ein Hinweis, bevor das nächste Fenster aufgeht. Gerechnet aus euren Einträgen.',
    feld: 'sleepWindowAlerts',
    standard: false,
  },
  medikament: {
    key: 'medikament',
    label: 'Medikamenten-Intervall',
    hint: 'Nur für Abstände, die ihr selbst eingetragen habt.',
    feld: 'medicationAlerts',
    standard: false,
  },
  vorrat: {
    key: 'vorrat',
    label: 'Milchvorrat',
    hint: 'Wenn abgepumpte Milch bald abläuft.',
    feld: 'milkStockAlerts',
    standard: false,
  },
  nachtschicht: {
    key: 'nachtschicht',
    label: 'Nachtschicht-Übergabe',
    hint: 'Wenn die andere Person eine Nacht einträgt oder eine Notiz hinterlässt.',
    feld: 'nightShiftAlerts',
    standard: false,
  },
  system: {
    key: 'system',
    label: 'Probenachricht',
    hint: 'Nur, wenn du sie hier selbst auslöst.',
    // Ohne Schalter: kommt ausschliesslich auf Knopfdruck.
    feld: null,
    standard: true,
  },
}

/** Kategorien mit Schalter, in der Reihenfolge der Einstellungsseite. */
export const SCHALTBARE_KATEGORIEN: PushKategorieInfo[] = [
  PUSH_KATEGORIEN_INFO.termin,
  PUSH_KATEGORIEN_INFO.schlaffenster,
  PUSH_KATEGORIEN_INFO.medikament,
  PUSH_KATEGORIEN_INFO.vorrat,
  PUSH_KATEGORIEN_INFO.nachtschicht,
]

export function istKategorie(value: string): value is PushKategorie {
  return (PUSH_KATEGORIEN as readonly string[]).includes(value)
}

export type PushPrefs = Partial<Record<PrefFeld, boolean>>

/**
 * Darf diese Nachricht raus? Unbekannte Kategorien nie – auch dann nicht,
 * wenn jemand sie mit `as` durchs Typsystem schmuggelt.
 */
export function darfSenden(kategorie: string, prefs: PushPrefs | null): boolean {
  if (!istKategorie(kategorie)) return false
  const info = PUSH_KATEGORIEN_INFO[kategorie]
  if (!info.feld) return true
  // Ohne gespeicherte Einstellung gilt der Auslieferungszustand.
  return prefs?.[info.feld] ?? info.standard
}

/** Die Werkseinstellung – alles aus ausser Terminfristen. */
export function standardPrefs(): Record<PrefFeld, boolean> {
  const result = {} as Record<PrefFeld, boolean>
  for (const info of SCHALTBARE_KATEGORIEN) {
    if (info.feld) result[info.feld] = info.standard
  }
  return result
}

/**
 * Vorschlag fuer die Ruhezeit, wenn zum ersten Mal etwas eingeschaltet wird.
 * Nicht als Vorgabe gesetzt, sondern als vorausgefuellte Antwort auf die
 * Frage – wer sie wegklickt, bekommt keine Ruhezeit.
 */
export const RUHEZEIT_VORSCHLAG = { von: '21:00', bis: '07:00' } as const

/**
 * Welcher Kategorie eine gespeicherte Erinnerung entspricht. Unbekannte Arten
 * ergeben `null` und werden nicht verschickt – lieber eine Erinnerung zu wenig
 * als eine, die durch die Erlaubnisliste rutscht.
 */
const REMINDER_KATEGORIE: Record<string, PushKategorie> = {
  vorsorge: 'termin',
  appointment: 'termin',
  medication: 'medikament',
  vorrat: 'vorrat',
  nachtschicht: 'nachtschicht',
  nap: 'schlaffenster',
}

export function kategorieFuerReminder(kind: string): PushKategorie | null {
  return REMINDER_KATEGORIE[kind] ?? null
}
