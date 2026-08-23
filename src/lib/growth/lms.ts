/**
 * LMS-Rechnung nach Cole & Green.
 *
 * Die WHO-Wachstumsstandards beschreiben je Alter und Geschlecht drei
 * Parameter: L (Box-Cox-Potenz), M (Median) und S (Variationskoeffizient).
 * Daraus laesst sich fuer jeden Messwert der z-Wert bestimmen – und umgekehrt
 * zu jedem z-Wert der zugehoerige Messwert, was die Kurven P3 bis P97 ergibt.
 *
 *   z = ((X/M)^L - 1) / (L * S)        fuer L != 0
 *   z = ln(X/M) / S                    fuer L  = 0
 */

export type LmsTable = {
  indicator: string
  sex: 'male' | 'female'
  xAxis: string
  start: number
  step: number
  lms: [number, number, number][]
}

export type LmsPoint = { l: number; m: number; s: number }

/** z-Wert aus Messwert und LMS-Parametern. */
export function lmsToZScore(value: number, { l, m, s }: LmsPoint): number {
  if (value <= 0 || m <= 0 || s <= 0) return Number.NaN
  return l === 0 ? Math.log(value / m) / s : ((value / m) ** l - 1) / (l * s)
}

/** Messwert aus z-Wert – so entstehen die Perzentilkurven. */
export function zScoreToValue(z: number, { l, m, s }: LmsPoint): number {
  return l === 0 ? m * Math.exp(s * z) : m * (1 + l * s * z) ** (1 / l)
}

/**
 * Standardnormalverteilung: z -> Perzentil in Prozent.
 * Abramowitz & Stegun 26.2.17, Fehler < 7.5e-8.
 */
export function zScoreToPercentile(z: number): number {
  if (!Number.isFinite(z)) return Number.NaN
  const sign = z < 0 ? -1 : 1
  const x = Math.abs(z) / Math.SQRT2
  const t = 1 / (1 + 0.3275911 * x)
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-x * x)
  return ((1 + sign * y) / 2) * 100
}

/** Perzentil in Prozent -> z-Wert (Inverse, Acklam-Approximation). */
export function percentileToZScore(percentile: number): number {
  const p = percentile / 100
  if (p <= 0 || p >= 1) return Number.NaN

  const a = [-39.6968302866538, 220.946098424521, -275.928510446969, 138.357751867269, -30.6647980661472, 2.50662827745924]
  const b = [-54.4760987982241, 161.585836858041, -155.698979859887, 66.8013118877197, -13.2806815528857]
  const c = [-0.00778489400243029, -0.322396458041136, -2.40075827716184, -2.54973253934373, 4.37466414146497, 2.93816398269878]
  const d = [0.00778469570904146, 0.32246712907004, 2.445134137143, 3.75440866190742]

  const pLow = 0.02425
  const pHigh = 1 - pLow

  if (p < pLow) {
    const q = Math.sqrt(-2 * Math.log(p))
    return (
      (((((c[0]! * q + c[1]!) * q + c[2]!) * q + c[3]!) * q + c[4]!) * q + c[5]!) /
      ((((d[0]! * q + d[1]!) * q + d[2]!) * q + d[3]!) * q + 1)
    )
  }
  if (p > pHigh) {
    const q = Math.sqrt(-2 * Math.log(1 - p))
    return (
      -(((((c[0]! * q + c[1]!) * q + c[2]!) * q + c[3]!) * q + c[4]!) * q + c[5]!) /
      ((((d[0]! * q + d[1]!) * q + d[2]!) * q + d[3]!) * q + 1)
    )
  }
  const q = p - 0.5
  const r = q * q
  return (
    ((((((a[0]! * r + a[1]!) * r + a[2]!) * r + a[3]!) * r + a[4]!) * r + a[5]!) * q) /
    (((((b[0]! * r + b[1]!) * r + b[2]!) * r + b[3]!) * r + b[4]!) * r + 1)
  )
}

export type LmsLookup = LmsPoint & { x: number; clamped: boolean }

/**
 * LMS-Parameter fuer einen Zeitpunkt. Zwischen zwei Tabellenzeilen wird linear
 * interpoliert; ausserhalb der Tabelle wird auf den Rand geklemmt und das
 * gemeldet – so kann die UI ehrlich sagen, dass sie extrapoliert.
 */
export function lookupLms(table: LmsTable, x: number): LmsLookup {
  const { start, step, lms } = table
  const lastIndex = lms.length - 1
  const rawIndex = (x - start) / step

  if (rawIndex <= 0) {
    const [l, m, s] = lms[0]!
    return { l, m, s, x: start, clamped: rawIndex < 0 }
  }
  if (rawIndex >= lastIndex) {
    const [l, m, s] = lms[lastIndex]!
    return { l, m, s, x: start + lastIndex * step, clamped: rawIndex > lastIndex }
  }

  const lower = Math.floor(rawIndex)
  const upper = lower + 1
  const fraction = rawIndex - lower
  const [l1, m1, s1] = lms[lower]!
  const [l2, m2, s2] = lms[upper]!

  return {
    l: l1 + (l2 - l1) * fraction,
    m: m1 + (m2 - m1) * fraction,
    s: s1 + (s2 - s1) * fraction,
    x,
    clamped: false,
  }
}
