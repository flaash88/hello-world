/**
 * Zeit-Helfer. Grundregel: In der DB steht alles in UTC, angezeigt wird in
 * der Haushalts-Zeitzone (Default Europe/Vienna), immer im 24-Stunden-Format.
 */
export const APP_TIMEZONE = process.env.TZ || 'Europe/Vienna'

const partsCache = new Map<string, Intl.DateTimeFormat>()

function formatter(tz: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = tz + JSON.stringify(options)
  let f = partsCache.get(key)
  if (!f) {
    f = new Intl.DateTimeFormat('de-AT', { timeZone: tz, hourCycle: 'h23', ...options })
    partsCache.set(key, f)
  }
  return f
}

export type ZonedParts = {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

/** Zerlegt einen UTC-Zeitpunkt in die Kalenderfelder der Zielzeitzone. */
export function zonedParts(date: Date, tz: string = APP_TIMEZONE): ZonedParts {
  const parts = formatter(tz, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date)
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? '0')
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second'),
  }
}

/** Offset der Zeitzone zu UTC in Minuten fuer einen konkreten Zeitpunkt. */
export function tzOffsetMinutes(date: Date, tz: string = APP_TIMEZONE): number {
  const p = zonedParts(date, tz)
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
  return Math.round((asUtc - Math.floor(date.getTime() / 1000) * 1000) / 60000)
}

/** Lokale Wanduhrzeit (in tz) -> UTC-Date. DST-sicher durch zweifache Korrektur. */
export function zonedTimeToUtc(
  parts: { year: number; month: number; day: number; hour?: number; minute?: number; second?: number },
  tz: string = APP_TIMEZONE,
): Date {
  const naive = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour ?? 0,
    parts.minute ?? 0,
    parts.second ?? 0,
  )
  let guess = new Date(naive - tzOffsetMinutes(new Date(naive), tz) * 60000)
  // Zweiter Durchlauf faengt Zeitumstellungen ab.
  guess = new Date(naive - tzOffsetMinutes(guess, tz) * 60000)
  return guess
}

/** Beginn des lokalen Tages (00:00 in tz) als UTC-Date. */
export function startOfLocalDay(date: Date, tz: string = APP_TIMEZONE): Date {
  const p = zonedParts(date, tz)
  return zonedTimeToUtc({ year: p.year, month: p.month, day: p.day }, tz)
}

/** Ende des lokalen Tages (exklusiv, = Beginn des Folgetags). */
export function endOfLocalDay(date: Date, tz: string = APP_TIMEZONE): Date {
  return addDays(startOfLocalDay(date, tz), 1, tz)
}

/** Addiert Kalendertage in der Zielzeitzone (DST-korrekt). */
export function addDays(date: Date, days: number, tz: string = APP_TIMEZONE): Date {
  const p = zonedParts(date, tz)
  return zonedTimeToUtc(
    { year: p.year, month: p.month, day: p.day + days, hour: p.hour, minute: p.minute, second: p.second },
    tz,
  )
}

/** "YYYY-MM-DD" in der Zielzeitzone – der Schluessel fuer Tagesgruppierungen. */
export function localDateKey(date: Date, tz: string = APP_TIMEZONE): string {
  const p = zonedParts(date, tz)
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`
}

/** Minuten seit lokalem Mitternacht – Basis fuer die 24h-Kreisuhr. */
export function minutesSinceLocalMidnight(date: Date, tz: string = APP_TIMEZONE): number {
  const p = zonedParts(date, tz)
  return p.hour * 60 + p.minute + p.second / 60
}

/** "14:05" */
export function formatTime(date: Date, tz: string = APP_TIMEZONE): string {
  return formatter(tz, { hour: '2-digit', minute: '2-digit' }).format(date)
}

/** "Do., 14. Aug." */
export function formatDateShort(date: Date, tz: string = APP_TIMEZONE): string {
  return formatter(tz, { weekday: 'short', day: 'numeric', month: 'short' }).format(date)
}

/** "14. August 2026" */
export function formatDateLong(date: Date, tz: string = APP_TIMEZONE): string {
  return formatter(tz, { day: 'numeric', month: 'long', year: 'numeric' }).format(date)
}

/** "Do., 14. Aug., 14:05" */
export function formatDateTime(date: Date, tz: string = APP_TIMEZONE): string {
  return `${formatDateShort(date, tz)}, ${formatTime(date, tz)}`
}

/** "1 Std 24 Min" / "8 Min" / "45 Sek" – kurz, gut lesbar im Halbdunkeln. */
export function formatDuration(seconds: number, opts: { short?: boolean } = {}): string {
  const total = Math.max(0, Math.round(seconds))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (opts.short) {
    if (h > 0) return `${h}:${String(m).padStart(2, '0')} h`
    if (m > 0) return `${m} min`
    return `${s} s`
  }
  if (h > 0) return m > 0 ? `${h} Std ${m} Min` : `${h} Std`
  if (m > 0) return s > 0 && m < 5 ? `${m} Min ${s} Sek` : `${m} Min`
  return `${s} Sek`
}

/** Stoppuhr-Format "01:23:45" bzw. "23:45". */
export function formatStopwatch(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${String(h).padStart(2, '0')}:${mm}:${ss}` : `${mm}:${ss}`
}

/** "vor 12 Min", "vor 3 Std", "gerade eben". */
export function formatRelative(date: Date, now: Date = new Date()): string {
  const diffSec = Math.round((now.getTime() - date.getTime()) / 1000)
  const abs = Math.abs(diffSec)
  const future = diffSec < 0
  if (abs < 45) return 'gerade eben'
  const mins = Math.round(abs / 60)
  if (mins < 60) return future ? `in ${mins} Min` : `vor ${mins} Min`
  const hours = Math.floor(mins / 60)
  const rest = mins % 60
  if (hours < 24) {
    const text = rest > 0 ? `${hours} Std ${rest} Min` : `${hours} Std`
    return future ? `in ${text}` : `vor ${text}`
  }
  const days = Math.round(hours / 24)
  return future ? `in ${days} Tg` : `vor ${days} Tg`
}

/** Ganze Tage zwischen zwei Zeitpunkten (kalendarisch, in tz). */
export function daysBetween(from: Date, to: Date, tz: string = APP_TIMEZONE): number {
  const a = startOfLocalDay(from, tz).getTime()
  const b = startOfLocalDay(to, tz).getTime()
  return Math.round((b - a) / 86400000)
}

/** Alter in Tagen; bei Fruehgeburt optional korrigiert auf den ET. */
export function ageInDays(birthDate: Date, at: Date = new Date(), tz: string = APP_TIMEZONE): number {
  return Math.max(0, daysBetween(birthDate, at, tz))
}

/** Lebenswoche (0-basiert): Tag 0–6 = Woche 0. */
export function ageInWeeks(birthDate: Date, at: Date = new Date(), tz: string = APP_TIMEZONE): number {
  return Math.floor(ageInDays(birthDate, at, tz) / 7)
}

/** Lebensmonat (0-basiert, kalendarisch). */
export function ageInMonths(birthDate: Date, at: Date = new Date(), tz: string = APP_TIMEZONE): number {
  const b = zonedParts(birthDate, tz)
  const n = zonedParts(at, tz)
  let months = (n.year - b.year) * 12 + (n.month - b.month)
  if (n.day < b.day) months -= 1
  return Math.max(0, months)
}

/** "3 Monate, 2 Wochen" – menschenlesbares Alter. */
export function formatAge(birthDate: Date, at: Date = new Date(), tz: string = APP_TIMEZONE): string {
  const days = ageInDays(birthDate, at, tz)
  if (days < 14) return days === 1 ? '1 Tag alt' : `${days} Tage alt`
  if (days < 63) {
    const weeks = Math.floor(days / 7)
    const rest = days % 7
    return rest === 0 ? `${weeks} Wochen alt` : `${weeks} Wochen, ${rest} Tage`
  }
  const months = ageInMonths(birthDate, at, tz)
  if (months < 24) {
    const anchor = addMonths(birthDate, months, tz)
    const restDays = daysBetween(anchor, at, tz)
    const restWeeks = Math.floor(restDays / 7)
    return restWeeks > 0 ? `${months} Monate, ${restWeeks} Wo.` : `${months} Monate alt`
  }
  const years = Math.floor(months / 12)
  const restMonths = months % 12
  return restMonths > 0 ? `${years} J., ${restMonths} Mon.` : `${years} Jahre alt`
}

export function addMonths(date: Date, months: number, tz: string = APP_TIMEZONE): Date {
  const p = zonedParts(date, tz)
  return zonedTimeToUtc(
    { year: p.year, month: p.month + months, day: p.day, hour: p.hour, minute: p.minute },
    tz,
  )
}

/** "HH:MM" -> Minuten seit Mitternacht; ungueltige Eingabe -> null. */
export function parseHhMm(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim())
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h > 23 || min > 59) return null
  return h * 60 + min
}

/**
 * Liegt `date` in einem (moeglicherweise ueber Mitternacht gehenden) Fenster?
 * Beispiel Nachtmodus 20:00–06:00.
 */
export function isWithinWindow(
  date: Date,
  from: string,
  to: string,
  tz: string = APP_TIMEZONE,
): boolean {
  const start = parseHhMm(from)
  const end = parseHhMm(to)
  if (start === null || end === null) return false
  const p = zonedParts(date, tz)
  const now = p.hour * 60 + p.minute
  return start <= end ? now >= start && now < end : now >= start || now < end
}
