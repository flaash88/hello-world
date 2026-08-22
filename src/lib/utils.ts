import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Initialen aus einem Anzeigenamen ("Anna Muster" -> "AM", "Papa" -> "PA"). */
export function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '??'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/** Median einer Zahlenliste; leere Liste -> null. */
export function median(values: readonly number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!
}

/** Quantil (lineare Interpolation), q in [0,1]. */
export function quantile(values: readonly number[], q: number): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const pos = (sorted.length - 1) * clamp(q, 0, 1)
  const lower = Math.floor(pos)
  const upper = Math.ceil(pos)
  if (lower === upper) return sorted[lower]!
  return sorted[lower]! + (sorted[upper]! - sorted[lower]!) * (pos - lower)
}

/**
 * Entfernt Ausreisser per IQR-Regel (1.5 * IQR). Robust gegen einzelne
 * Marathon-Wachfenster (Autofahrt, Arztbesuch) im Schlaf-Algorithmus.
 */
export function withoutOutliers(values: readonly number[]): number[] {
  if (values.length < 4) return [...values]
  const q1 = quantile(values, 0.25)!
  const q3 = quantile(values, 0.75)!
  const iqr = q3 - q1
  const lo = q1 - 1.5 * iqr
  const hi = q3 + 1.5 * iqr
  return values.filter((v) => v >= lo && v <= hi)
}

export function sum(values: readonly number[]): number {
  return values.reduce((a, b) => a + b, 0)
}

export function mean(values: readonly number[]): number | null {
  return values.length === 0 ? null : sum(values) / values.length
}

/** Gruppiert eine Liste nach einem Schluessel. */
export function groupBy<T, K extends string | number>(
  items: readonly T[],
  key: (item: T) => K,
): Map<K, T[]> {
  const map = new Map<K, T[]>()
  for (const item of items) {
    const k = key(item)
    const bucket = map.get(k)
    if (bucket) bucket.push(item)
    else map.set(k, [item])
  }
  return map
}
