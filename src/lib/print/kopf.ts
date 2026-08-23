/**
 * Kopfzeile fuer alles, was ausgedruckt oder als PDF weitergegeben wird.
 *
 * Der Zettel fuer die Ordination (Fieberverlauf) und das Stillprotokoll fuer
 * die Hebamme fragen nach denselben Angaben: Wer ist das Kind, wie alt, wie
 * schwer, und ueber welchen Zeitraum reden wir. Deshalb steht der Kopf einmal
 * hier und nicht zweimal in zwei Ansichten.
 *
 * Reine Datenaufbereitung, kein Layout – gezeichnet wird in
 * `src/lib/print/document.ts` (PDF) bzw. `src/components/print/print-header.tsx`
 * (Druckansicht im Browser).
 */
import { APP_TIMEZONE, ageInMonths, formatDateLong, formatDateShort } from '@/lib/time'
import { DEFAULT_UNITS, formatGrams, formatWeight, type UnitPrefs } from '@/lib/units'

export type KopfEingabe = {
  childName: string
  birthDate: Date | null
  /** Geburtsgewicht in Gramm, falls hinterlegt. */
  birthWeightG?: number | null
  /** Juengste Gewichtsmessung in Kilogramm. */
  currentWeightKg?: number | null
  currentWeightAt?: Date | null
  /** Zeitraum, den die Ausgabe abdeckt. `to` ist einschliesslich. */
  from?: Date | null
  to?: Date | null
  timezone?: string
  units?: UnitPrefs
  now?: Date
}

export type KopfFeld = { label: string; wert: string }

export type Kopf = {
  titel: string
  felder: KopfFeld[]
}

/**
 * Baut Titel und Felder. Was nicht hinterlegt ist, steht als „nicht
 * eingetragen“ da – ein leeres Feld auf einem Zettel, den jemand anderes liest,
 * wirft mehr Fragen auf, als es beantwortet.
 */
export function druckKopf(titel: string, eingabe: KopfEingabe): Kopf {
  const tz = eingabe.timezone ?? APP_TIMEZONE
  const units = eingabe.units ?? DEFAULT_UNITS
  const now = eingabe.now ?? new Date()

  const felder: KopfFeld[] = [{ label: 'Kind', wert: eingabe.childName }]

  if (eingabe.birthDate) {
    const monate = ageInMonths(eingabe.birthDate, now, tz)
    felder.push({
      label: 'Geboren',
      wert: `${formatDateLong(eingabe.birthDate, tz)} (${monate} ${monate === 1 ? 'Monat' : 'Monate'})`,
    })
  } else {
    felder.push({ label: 'Geboren', wert: 'nicht eingetragen' })
  }

  if (eingabe.birthWeightG !== undefined) {
    felder.push({
      label: 'Geburtsgewicht',
      wert:
        eingabe.birthWeightG !== null && eingabe.birthWeightG !== undefined
          ? formatGrams(eingabe.birthWeightG, units)
          : 'nicht eingetragen',
    })
  }

  if (eingabe.currentWeightKg !== undefined) {
    felder.push({
      label: 'Aktuelles Gewicht',
      wert:
        eingabe.currentWeightKg !== null && eingabe.currentWeightKg !== undefined
          ? formatWeight(eingabe.currentWeightKg, units) +
            (eingabe.currentWeightAt ? ` (${formatDateShort(eingabe.currentWeightAt, tz)})` : '')
          : 'nicht eingetragen',
    })
  }

  if (eingabe.from && eingabe.to) {
    felder.push({
      label: 'Zeitraum',
      wert: `${formatDateShort(eingabe.from, tz)} bis ${formatDateShort(eingabe.to, tz)}`,
    })
  }

  return { titel, felder }
}

/** Dateiname fuer den PDF-Download: klein, ohne Umlaute, mit Datum. */
export function druckDateiname(
  praefix: string,
  childName: string,
  datum: Date,
  tz: string = APP_TIMEZONE,
): string {
  const name = childName
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  const tag = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(datum)
  return `${praefix}-${name || 'kind'}-${tag}.pdf`
}
