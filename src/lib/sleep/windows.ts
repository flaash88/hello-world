/**
 * Altersabhaengige Wachfenster und Schlafbedarf.
 *
 * Quellen der Startwerte (alle oeffentlich zugaenglich, Werte hier
 * eigenstaendig als Tabelle zusammengefasst, keine Uebernahme fremder Texte):
 *
 * - American Academy of Sleep Medicine, Consensus Statement on Recommended
 *   Amount of Sleep for Pediatric Populations (2016) – Gesamtschlafbedarf
 *   je Altersgruppe.
 * - National Sleep Foundation, Sleep Duration Recommendations (2015) –
 *   Bandbreiten je Altersgruppe.
 * - Iglowstein et al., Sleep Duration from Infancy to Adolescence (Pediatrics
 *   2003) – Laengsschnittdaten zu Gesamtschlaf und Nickerchenzahl.
 *
 * Die Wachfenster selbst sind in der Literatur nicht einheitlich normiert; die
 * Startwerte hier sind eine konservative Zusammenfassung der ueblichen
 * Praxisempfehlungen. Sie dienen ausschliesslich als Startpunkt: Sobald genug
 * eigene Messungen vorliegen, ersetzt der gemessene Median des Kindes diese
 * Werte (siehe adaptive.ts).
 */

export type WakeWindow = {
  /** Untere Altersgrenze in Tagen (einschliesslich). */
  fromDays: number
  /** Typisches Wachfenster in Minuten. */
  typicalMin: number
  /** Plausibler Bereich in Minuten – Grundlage des Vorhersagefensters. */
  minMin: number
  maxMin: number
  /** Empfohlener Gesamtschlaf in 24 Stunden, in Minuten. */
  totalSleepMin: number
  totalSleepMax: number
  /** Uebliche Anzahl Nickerchen am Tag. */
  napsMin: number
  napsMax: number
  label: string
}

export const WAKE_WINDOWS: WakeWindow[] = [
  { fromDays: 0, typicalMin: 50, minMin: 35, maxMin: 60, totalSleepMin: 840, totalSleepMax: 1020, napsMin: 4, napsMax: 8, label: '0–4 Wochen' },
  { fromDays: 28, typicalMin: 70, minMin: 50, maxMin: 90, totalSleepMin: 840, totalSleepMax: 1000, napsMin: 4, napsMax: 6, label: '1–2 Monate' },
  { fromDays: 56, typicalMin: 85, minMin: 60, maxMin: 105, totalSleepMin: 810, totalSleepMax: 960, napsMin: 3, napsMax: 5, label: '2–3 Monate' },
  { fromDays: 91, typicalMin: 100, minMin: 75, maxMin: 120, totalSleepMin: 780, totalSleepMax: 930, napsMin: 3, napsMax: 5, label: '3–4 Monate' },
  { fromDays: 121, typicalMin: 120, minMin: 90, maxMin: 150, totalSleepMin: 750, totalSleepMax: 900, napsMin: 3, napsMax: 4, label: '4–6 Monate' },
  { fromDays: 182, typicalMin: 150, minMin: 120, maxMin: 180, totalSleepMin: 720, totalSleepMax: 870, napsMin: 2, napsMax: 3, label: '6–9 Monate' },
  { fromDays: 274, typicalMin: 180, minMin: 150, maxMin: 225, totalSleepMin: 690, totalSleepMax: 840, napsMin: 2, napsMax: 2, label: '9–12 Monate' },
  { fromDays: 365, typicalMin: 225, minMin: 180, maxMin: 270, totalSleepMin: 660, totalSleepMax: 840, napsMin: 1, napsMax: 2, label: '12–18 Monate' },
  { fromDays: 548, typicalMin: 300, minMin: 240, maxMin: 360, totalSleepMin: 660, totalSleepMax: 840, napsMin: 1, napsMax: 1, label: '18–24 Monate' },
  { fromDays: 730, typicalMin: 330, minMin: 270, maxMin: 390, totalSleepMin: 660, totalSleepMax: 780, napsMin: 0, napsMax: 1, label: '2–3 Jahre' },
  { fromDays: 1095, typicalMin: 390, minMin: 300, maxMin: 480, totalSleepMin: 600, totalSleepMax: 780, napsMin: 0, napsMax: 1, label: 'ab 3 Jahren' },
]

/** Passender Tabelleneintrag zum Alter in Tagen. */
export function wakeWindowFor(ageDays: number): WakeWindow {
  const clamped = Math.max(0, ageDays)
  let match = WAKE_WINDOWS[0]!
  for (const entry of WAKE_WINDOWS) {
    if (clamped >= entry.fromDays) match = entry
    else break
  }
  return match
}

/**
 * Interpoliert das typische Wachfenster zwischen zwei Altersstufen. Ohne das
 * springt die Vorhersage an einem Geburtstag um eine halbe Stunde.
 */
export function interpolatedWakeWindow(ageDays: number): number {
  const clamped = Math.max(0, ageDays)
  const index = WAKE_WINDOWS.findLastIndex((entry) => clamped >= entry.fromDays)
  const current = WAKE_WINDOWS[Math.max(0, index)]!
  const next = WAKE_WINDOWS[index + 1]
  if (!next) return current.typicalMin

  const span = next.fromDays - current.fromDays
  const progress = span <= 0 ? 0 : (clamped - current.fromDays) / span
  return Math.round(current.typicalMin + (next.typicalMin - current.typicalMin) * progress)
}

/**
 * Korrigiertes Alter bei Fruehgeburt: Bis zwei Jahre rechnet man vom
 * errechneten Termin, nicht vom Geburtstag – sonst sind alle Erwartungen zu
 * hoch angesetzt.
 */
export function correctedAgeDays(
  ageDays: number,
  birthDate: Date,
  dueDate: Date | null,
): number {
  if (!dueDate) return ageDays
  const prematureDays = Math.round((dueDate.getTime() - birthDate.getTime()) / 86400000)
  // Unter zwei Wochen Unterschied lohnt die Korrektur nicht.
  if (prematureDays < 14) return ageDays
  // Ab zwei Jahren wird nicht mehr korrigiert.
  if (ageDays > 730) return ageDays
  return Math.max(0, ageDays - prematureDays)
}
