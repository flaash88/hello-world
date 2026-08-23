/**
 * Einheiten. Gespeichert wird ausnahmslos metrisch (kg, cm, °C, ml) – die
 * Voreinstellung wandelt nur an der Oberflaeche um. So bleiben Auswertungen,
 * WHO-Perzentile und Export unabhaengig davon, was jemand eingestellt hat.
 */
import { localeTag } from './i18n'


export type WeightUnit = 'kg' | 'lb'
export type LengthUnit = 'cm' | 'in'
export type TempUnit = 'c' | 'f'
export type VolumeUnit = 'ml' | 'oz'

export type UnitPrefs = {
  weight: WeightUnit
  length: LengthUnit
  temp: TempUnit
  volume: VolumeUnit
}

export type UnitKind = keyof UnitPrefs

export const DEFAULT_UNITS: UnitPrefs = { weight: 'kg', length: 'cm', temp: 'c', volume: 'ml' }

// Umrechnungsfaktoren: internationales Pfund, Zoll, US-Fluessigunze.
const LB_PER_KG = 2.2046226218487757
const IN_PER_CM = 0.39370078740157477
const ML_PER_OZ = 29.5735295625
// Massenunze – nicht zu verwechseln mit der Fluessigunze oben.
const G_PER_OZ = 28.349523125

type UnitSpec = { label: string; decimals: number; step: number }

const SPECS: { [K in UnitKind]: Record<UnitPrefs[K], UnitSpec> } = {
  weight: {
    kg: { label: 'kg', decimals: 2, step: 0.05 },
    lb: { label: 'lb', decimals: 2, step: 0.1 },
  },
  length: {
    cm: { label: 'cm', decimals: 1, step: 0.5 },
    in: { label: 'in', decimals: 1, step: 0.25 },
  },
  temp: {
    c: { label: '°C', decimals: 1, step: 0.1 },
    f: { label: '°F', decimals: 1, step: 0.2 },
  },
  volume: {
    ml: { label: 'ml', decimals: 0, step: 10 },
    oz: { label: 'oz', decimals: 1, step: 0.5 },
  },
}

/** Liest die Haushaltseinstellung ein und faellt auf metrisch zurueck. */
export function unitPrefsFrom(
  settings:
    | { unitWeight: string; unitLength: string; unitTemp: string; unitVolume: string }
    | null
    | undefined,
): UnitPrefs {
  if (!settings) return DEFAULT_UNITS
  return {
    weight: settings.unitWeight === 'lb' ? 'lb' : 'kg',
    length: settings.unitLength === 'in' ? 'in' : 'cm',
    temp: settings.unitTemp === 'f' ? 'f' : 'c',
    volume: settings.unitVolume === 'oz' ? 'oz' : 'ml',
  }
}

function spec(kind: UnitKind, prefs: UnitPrefs): UnitSpec {
  switch (kind) {
    case 'weight':
      return SPECS.weight[prefs.weight]
    case 'length':
      return SPECS.length[prefs.length]
    case 'temp':
      return SPECS.temp[prefs.temp]
    case 'volume':
      return SPECS.volume[prefs.volume]
  }
}

export function unitLabel(kind: UnitKind, prefs: UnitPrefs = DEFAULT_UNITS): string {
  return spec(kind, prefs).label
}

export function unitDecimals(kind: UnitKind, prefs: UnitPrefs = DEFAULT_UNITS): number {
  return spec(kind, prefs).decimals
}

export function unitStep(kind: UnitKind, prefs: UnitPrefs = DEFAULT_UNITS): number {
  return spec(kind, prefs).step
}

/** Metrischer Speicherwert -> Anzeigewert in der eingestellten Einheit. */
export function toDisplay(kind: UnitKind, value: number, prefs: UnitPrefs = DEFAULT_UNITS): number {
  switch (kind) {
    case 'weight':
      return prefs.weight === 'lb' ? value * LB_PER_KG : value
    case 'length':
      return prefs.length === 'in' ? value * IN_PER_CM : value
    case 'temp':
      return prefs.temp === 'f' ? value * 1.8 + 32 : value
    case 'volume':
      return prefs.volume === 'oz' ? value / ML_PER_OZ : value
  }
}

/** Anzeigewert -> metrischer Speicherwert. */
export function fromDisplay(kind: UnitKind, value: number, prefs: UnitPrefs = DEFAULT_UNITS): number {
  switch (kind) {
    case 'weight':
      return prefs.weight === 'lb' ? value / LB_PER_KG : value
    case 'length':
      return prefs.length === 'in' ? value / IN_PER_CM : value
    case 'temp':
      return prefs.temp === 'f' ? (value - 32) / 1.8 : value
    case 'volume':
      return prefs.volume === 'oz' ? value * ML_PER_OZ : value
  }
}

/** Auf die Nachkommastellen der Einheit gerundeter Anzeigewert. */
export function roundedDisplay(
  kind: UnitKind,
  value: number,
  prefs: UnitPrefs = DEFAULT_UNITS,
): number {
  const factor = 10 ** unitDecimals(kind, prefs)
  return Math.round(toDisplay(kind, value, prefs) * factor) / factor
}

/** Fertiger Text inklusive Einheit, deutsch formatiert (Dezimalkomma). */
export function formatUnit(
  kind: UnitKind,
  value: number,
  prefs: UnitPrefs = DEFAULT_UNITS,
  options: { withUnit?: boolean } = {},
): string {
  const { label, decimals } = spec(kind, prefs)
  const text = toDisplay(kind, value, prefs).toLocaleString(localeTag(), {
    minimumFractionDigits: kind === 'temp' ? decimals : 0,
    maximumFractionDigits: decimals,
  })
  return options.withUnit === false ? text : `${text} ${label}`
}

export function formatWeight(kg: number, prefs: UnitPrefs = DEFAULT_UNITS): string {
  return formatUnit('weight', kg, prefs)
}

export function formatLength(cm: number, prefs: UnitPrefs = DEFAULT_UNITS): string {
  return formatUnit('length', cm, prefs)
}

export function formatTemperature(celsius: number, prefs: UnitPrefs = DEFAULT_UNITS): string {
  return formatUnit('temp', celsius, prefs)
}

export function formatVolume(ml: number, prefs: UnitPrefs = DEFAULT_UNITS): string {
  return formatUnit('volume', ml, prefs)
}

/**
 * Kleine Massen (Gewicht des Foetus, Portionen). Unter einem Kilo ist Gramm
 * bzw. Unze die lesbarere Einheit als kg oder lb.
 */
export function formatMass(grams: number, prefs: UnitPrefs = DEFAULT_UNITS): string {
  if (prefs.weight === 'lb') {
    const ounces = grams / G_PER_OZ
    if (ounces >= 16) return formatWeight(grams / 1000, prefs)
    return `${ounces.toLocaleString(localeTag(), { maximumFractionDigits: 1 })} oz`
  }
  if (grams >= 1000) return formatWeight(grams / 1000, prefs)
  return `${grams.toLocaleString(localeTag(), { maximumFractionDigits: 0 })} g`
}
