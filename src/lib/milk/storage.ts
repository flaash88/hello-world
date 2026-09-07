/**
 * Haltbarkeit von abgepumpter Muttermilch.
 *
 * Die Werte sind die uebliche Empfehlung fuer gesunde, reif geborene Kinder
 * im Haushalt (nicht fuer die Klinik). Sie stammen aus den frei zugaenglichen
 * Angaben der CDC zur Aufbewahrung von Muttermilch
 * (cdc.gov, "Proper Storage and Preparation of Breast Milk", Stand 2026-08-23)
 * und decken sich mit dem, was oesterreichische Stillberatungen nennen.
 *
 * Wichtig, und deshalb hier und nicht nur in der UI: Es sind Richtwerte, keine
 * Garantie. Wie lange die Milch wirklich haelt, haengt an Hygiene beim
 * Abpumpen, an der tatsaechlichen Temperatur im Geraet und daran, wie oft die
 * Tuer aufgeht. Wer unsicher ist, riecht und verwirft im Zweifel.
 *
 * Die Werte lassen sich im Haushalt anpassen (Einstellungen → Milchvorrat) –
 * hier stehen nur die Vorgaben.
 */

export const LAGERORTE = ['kuehlschrank', 'gefrierfach', 'tiefkuehler'] as const
export type Lagerort = (typeof LAGERORTE)[number]

export const LAGERORT_LABEL: Record<Lagerort, string> = {
  kuehlschrank: 'Kühlschrank',
  gefrierfach: 'Gefrierfach',
  tiefkuehler: 'Tiefkühler',
}

export const LAGERORT_HINWEIS: Record<Lagerort, string> = {
  kuehlschrank: 'Hinten im Kühlschrank, nicht in der Tür – dort ist es am kältesten.',
  gefrierfach:
    'Das Fach im Kühlschrank. Hält die −18 °C meist nicht durchgehend – deshalb die kurze Frist. Wenn deines das schafft, stell den Wert in den Einstellungen höher.',
  tiefkuehler: 'Eigenes Gerät oder Truhe bei etwa −18 °C.',
}

/**
 * Vorgaben in Stunden.
 *
 * Das Gefrierfach im Kuehlschrank ist **kein** Tiefkuehler: Die CDC nennt
 * dafuer zwei Wochen, nicht Monate. Der Grund ist nicht die Bauart, sondern die
 * Temperatur – ein Fach, dessen Tuer mehrmals taeglich aufgeht, haelt die
 * −18 °C nicht zuverlaessig. Hier stand vorher ein halbes Jahr; das war die
 * Zahl fuer eine Truhe, an der falschen Stelle.
 *
 * Wessen Fach echte −18 °C haelt, stellt den Wert unter Einstellungen →
 * Milchvorrat hoeher. Die Vorgabe ist bewusst die vorsichtige.
 */
export const HALTBARKEIT_STUNDEN: Record<Lagerort, number> = {
  kuehlschrank: 4 * 24,
  gefrierfach: 14 * 24,
  tiefkuehler: 12 * 30 * 24,
}

/**
 * Aufgetaute Milch haelt deutlich kuerzer als frische – und darf nicht wieder
 * eingefroren werden. Deshalb bekommt sie ein eigenes, kurzes Fenster ab dem
 * Auftauen.
 */
export const AUFGETAUT_STUNDEN = 24

export type Haltbarkeiten = Record<Lagerort, number> & { aufgetaut: number }

export const HALTBARKEIT_VORGABE: Haltbarkeiten = {
  ...HALTBARKEIT_STUNDEN,
  aufgetaut: AUFGETAUT_STUNDEN,
}

/** Grenzen fuer die Einstellung – Unsinn soll gar nicht erst speicherbar sein. */
export const HALTBARKEIT_MIN_STUNDEN = 1
export const HALTBARKEIT_MAX_STUNDEN = 24 * 400

export function haltbarkeitenAus(
  settings: Partial<Record<keyof Haltbarkeiten, number | null | undefined>> | null | undefined,
): Haltbarkeiten {
  const werte = { ...HALTBARKEIT_VORGABE }
  if (!settings) return werte
  for (const key of Object.keys(werte) as (keyof Haltbarkeiten)[]) {
    const wert = settings[key]
    if (typeof wert === 'number' && wert >= HALTBARKEIT_MIN_STUNDEN && wert <= HALTBARKEIT_MAX_STUNDEN) {
      werte[key] = wert
    }
  }
  return werte
}

/** "4 Tage", "6 Monate", "18 Stunden" – kurz und lesbar. */
export function haltbarkeitText(stunden: number): string {
  if (stunden < 48) return stunden === 1 ? '1 Stunde' : `${stunden} Stunden`
  const tage = Math.round(stunden / 24)
  if (tage < 60) return tage === 1 ? '1 Tag' : `${tage} Tage`
  const monate = Math.round(tage / 30)
  return monate === 1 ? '1 Monat' : `${monate} Monate`
}

/** Die im Haushalt eingestellten Haltbarkeiten. */
export function haltbarkeitenAusSettings(
  settings:
    | {
        milkFridgeHours?: number | null
        milkFreezerHours?: number | null
        milkDeepFreezeHours?: number | null
        milkThawedHours?: number | null
      }
    | null
    | undefined,
): Haltbarkeiten {
  return haltbarkeitenAus({
    kuehlschrank: settings?.milkFridgeHours,
    gefrierfach: settings?.milkFreezerHours,
    tiefkuehler: settings?.milkDeepFreezeHours,
    aufgetaut: settings?.milkThawedHours,
  })
}
