/**
 * Reine Logik fuer die Vorsorge: aus Geburtsdatum und Zeitfenster wird ein
 * konkretes Datum, aus Datum und Erledigt-Eintrag ein Status.
 *
 * Bewusst ohne DB- und ohne Dateizugriff, damit sie testbar bleibt. Die Daten
 * kommen aus `content/vorsorge/*.json` (siehe `load.ts`), die erledigten
 * Eintraege aus der Tabelle `VorsorgeEntry`.
 */
import { APP_TIMEZONE, addDays, addMonths, daysBetween, formatDateShort } from '@/lib/time'
import type { Fenster, Impfung, KbgFrist, Untersuchung, VorsorgeKind } from './schema'

export const VORSORGE_STATUS = [
  'erledigt',
  'ueberfaellig',
  'faellig',
  'offen',
  'ohneFenster',
] as const
export type VorsorgeStatus = (typeof VORSORGE_STATUS)[number]

/** Erinnerung 14 Tage vor Fensterende, zweite Erinnerung 3 Tage davor. */
export const REMINDER_OFFSETS_DAYS = [14, 3] as const

export type Zeitfenster = {
  /** Frueheste sinnvolle Zeit. null, wenn die Quelle keinen Beginn nennt. */
  from: Date | null
  /** Ende des Fensters (exklusiv) – der Tag, an dem es zugeht. */
  to: Date | null
}

/**
 * Rechnet ein Fenster aus vollendeten Lebenswochen/-monaten in Daten um.
 * Wochen sind exakte Sieben-Tage-Schritte, Monate kalendarisch – ein Kind ist
 * am 14. Maerz drei Monate alt, wenn es am 14. Dezember geboren wurde.
 */
export function zeitfensterFor(
  birthDate: Date,
  fenster: Fenster | null,
  tz: string = APP_TIMEZONE,
): Zeitfenster {
  if (!fenster) return { from: null, to: null }

  const von =
    fenster.vonWochen !== undefined
      ? addDays(birthDate, fenster.vonWochen * 7, tz)
      : fenster.vonMonaten !== undefined
        ? addMonths(birthDate, fenster.vonMonaten, tz)
        : null
  const bis =
    fenster.bisWochen !== undefined
      ? addDays(birthDate, fenster.bisWochen * 7, tz)
      : fenster.bisMonaten !== undefined
        ? addMonths(birthDate, fenster.bisMonaten, tz)
        : null

  return { from: von, to: bis }
}

/** Der letzte Tag, an dem das Fenster noch offen ist – fuer die Anzeige. */
export function letzterTag(fenster: Zeitfenster, tz: string = APP_TIMEZONE): Date | null {
  return fenster.to ? addDays(fenster.to, -1, tz) : null
}

export function statusFor(
  fenster: Zeitfenster,
  doneAt: Date | null,
  now: Date = new Date(),
): VorsorgeStatus {
  if (doneAt) return 'erledigt'
  if (!fenster.from && !fenster.to) return 'ohneFenster'
  if (fenster.to && now.getTime() >= fenster.to.getTime()) return 'ueberfaellig'
  if (fenster.from && now.getTime() < fenster.from.getTime()) return 'offen'
  return 'faellig'
}

/**
 * Die beiden Erinnerungszeitpunkte vor dem Fensterende. Liegt das Fenster
 * schon zu oder ist der Zeitpunkt vorbei, faellt er weg.
 */
export function erinnerungenFor(
  fenster: Zeitfenster,
  now: Date = new Date(),
  tz: string = APP_TIMEZONE,
): { offsetDays: number; dueAt: Date }[] {
  if (!fenster.to) return []
  return REMINDER_OFFSETS_DAYS.map((offsetDays) => ({
    offsetDays,
    dueAt: addDays(fenster.to as Date, -offsetDays, tz),
  })).filter((r) => r.dueAt.getTime() > now.getTime())
}

/**
 * Kurzer Text zum Fenster. Bei abgelaufenem Fenster bewusst sachlich: ein
 * verpasster Termin wird nachgeholt, nicht betrauert.
 */
export function fensterText(
  fenster: Zeitfenster,
  status: VorsorgeStatus,
  now: Date = new Date(),
  tz: string = APP_TIMEZONE,
): string {
  const ende = letzterTag(fenster, tz)
  if (status === 'ohneFenster') return 'Zeitraum nicht hinterlegt'
  if (status === 'ueberfaellig') {
    return ende
      ? `Fenster seit ${formatDateShort(ende, tz)} vorbei – Termin lässt sich nachholen`
      : 'Fenster vorbei – Termin lässt sich nachholen'
  }
  if (status === 'offen' && fenster.from) {
    return `ab ${formatDateShort(fenster.from, tz)}`
  }
  if (ende) {
    const tage = daysBetween(now, ende, tz)
    if (tage <= 0) return `noch heute (bis ${formatDateShort(ende, tz)})`
    if (tage === 1) return `noch 1 Tag (bis ${formatDateShort(ende, tz)})`
    return `noch ${tage} Tage (bis ${formatDateShort(ende, tz)})`
  }
  return 'jetzt möglich'
}

// ------------------------------------------------------------- Listenbau --

export type VorsorgeEintrag = {
  kind: VorsorgeKind
  key: string
  titel: string
  /** Untertitel: Schutz gegen … bzw. durchfuehrende Stelle. */
  untertitel: string
  hinweis: string
  /** Wortlaut des Zeitfensters aus der Quelle. */
  quellText: string | null
  quelle: string | null
  fenster: Zeitfenster
  status: VorsorgeStatus
  statusText: string
  separaterTermin: boolean
  kbgRelevant: boolean
  kostenfrei: boolean | null
  doneAt: Date | null
  entryId: string | null
  ort: string | null
  note: string | null
}

export type ErledigtEintrag = {
  id: string
  kind: string
  templateKey: string
  doneAt: Date
  ort?: string | null
  note?: string | null
}

function indexDone(done: ErledigtEintrag[], kind: VorsorgeKind) {
  const map = new Map<string, ErledigtEintrag>()
  for (const entry of done) {
    if (entry.kind === kind) map.set(entry.templateKey, entry)
  }
  return map
}

/**
 * Sortierung fuer die Liste: was jetzt dran ist, steht oben. Danach das
 * Verpasste, dann das Kommende, dann das ohne belegten Zeitraum, ganz unten
 * das Erledigte.
 */
const STATUS_ORDER: Record<VorsorgeStatus, number> = {
  faellig: 0,
  ueberfaellig: 1,
  offen: 2,
  ohneFenster: 3,
  erledigt: 4,
}

function sortEintraege(list: VorsorgeEintrag[]): VorsorgeEintrag[] {
  return [...list].sort((a, b) => {
    const byStatus = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
    if (byStatus !== 0) return byStatus
    if (a.status === 'erledigt') {
      return (b.doneAt?.getTime() ?? 0) - (a.doneAt?.getTime() ?? 0)
    }
    const aKey = a.fenster.from?.getTime() ?? a.fenster.to?.getTime() ?? Number.MAX_SAFE_INTEGER
    const bKey = b.fenster.from?.getTime() ?? b.fenster.to?.getTime() ?? Number.MAX_SAFE_INTEGER
    return aKey - bKey
  })
}

export function impfEintraege(
  impfungen: Impfung[],
  birthDate: Date,
  done: ErledigtEintrag[],
  now: Date = new Date(),
  tz: string = APP_TIMEZONE,
): VorsorgeEintrag[] {
  const map = indexDone(done, 'impfung')
  return sortEintraege(
    impfungen.map((impfung) => {
      const entry = map.get(impfung.key) ?? null
      const fenster = zeitfensterFor(birthDate, impfung.fenster, tz)
      const status = statusFor(fenster, entry?.doneAt ?? null, now)
      return {
        kind: 'impfung' as const,
        key: impfung.key,
        titel: impfung.name,
        untertitel: `Schutz gegen ${impfung.schutzGegen.join(', ')}`,
        hinweis: impfung.hinweis,
        quellText: null,
        quelle: impfung.quelle,
        fenster,
        status,
        statusText: fensterText(fenster, status, now, tz),
        separaterTermin: false,
        kbgRelevant: false,
        kostenfrei: impfung.kostenfrei,
        doneAt: entry?.doneAt ?? null,
        entryId: entry?.id ?? null,
        ort: entry?.ort ?? null,
        note: entry?.note ?? null,
      }
    }),
  )
}

export function untersuchungsEintraege(
  untersuchungen: Untersuchung[],
  birthDate: Date,
  done: ErledigtEintrag[],
  now: Date = new Date(),
  tz: string = APP_TIMEZONE,
): VorsorgeEintrag[] {
  const map = indexDone(done, 'untersuchung')
  return sortEintraege(
    untersuchungen.map((u) => {
      const key = `ekp-kind-${u.nummer}`
      const entry = map.get(key) ?? null
      const fenster = zeitfensterFor(birthDate, u.fenster, tz)
      const status = statusFor(fenster, entry?.doneAt ?? null, now)
      return {
        kind: 'untersuchung' as const,
        key,
        titel: `${u.nummer}. ${u.bezeichnung}`,
        untertitel: u.durchfuehrendeStelle,
        hinweis: u.inhalt,
        quellText: u.fensterText,
        quelle: u.quelle,
        fenster,
        status,
        statusText: fensterText(fenster, status, now, tz),
        separaterTermin: u.separaterTermin,
        kbgRelevant: u.kbgRelevant,
        kostenfrei: null,
        doneAt: entry?.doneAt ?? null,
        entryId: entry?.id ?? null,
        ort: entry?.ort ?? null,
        note: entry?.note ?? null,
      }
    }),
  )
}

// -------------------------------------------------- Kinderbetreuungsgeld --

export type KbgFristStatus = {
  key: string
  bezeichnung: string
  wann: string
  faelligAm: Date | null
  status: VorsorgeStatus
  statusText: string
  quelle: string | null
}

export function kbgFristen(
  fristen: KbgFrist[],
  birthDate: Date,
  now: Date = new Date(),
  tz: string = APP_TIMEZONE,
): KbgFristStatus[] {
  return fristen.map((frist) => {
    const fenster: Zeitfenster =
      frist.bisMonaten === undefined || frist.bisMonaten === null
        ? { from: null, to: null }
        : { from: birthDate, to: addMonths(birthDate, frist.bisMonaten, tz) }
    const status = statusFor(fenster, null, now)
    return {
      key: frist.key,
      bezeichnung: frist.bezeichnung,
      wann: frist.wann,
      faelligAm: letzterTag(fenster, tz),
      status,
      statusText: fenster.to ? fensterText(fenster, status, now, tz) : frist.wann,
      quelle: frist.quelle ?? null,
    }
  })
}

// --------------------------------------------------------------- Verlauf --

export type VerlaufAbschnitt = { label: string; bisMonaten: number; eintraege: VorsorgeEintrag[] }

const VERLAUF_ABSCHNITTE: { label: string; bisMonaten: number }[] = [
  { label: 'Erstes halbes Jahr', bisMonaten: 6 },
  { label: '6 bis 12 Monate', bisMonaten: 12 },
  { label: '2. Lebensjahr', bisMonaten: 24 },
  { label: '3. Lebensjahr', bisMonaten: 36 },
  { label: '4. und 5. Lebensjahr', bisMonaten: 62 },
]

/**
 * Zeitstrahl ueber die ersten fuenf Jahre. Eintraege ohne belegtes Fenster
 * kommen in einen eigenen Abschnitt ganz am Ende – sie zu raten waere falsch.
 */
export function verlauf(
  eintraege: VorsorgeEintrag[],
  birthDate: Date,
  tz: string = APP_TIMEZONE,
): { abschnitte: VerlaufAbschnitt[]; ohneFenster: VorsorgeEintrag[] } {
  const grenzen = VERLAUF_ABSCHNITTE.map((a) => ({
    ...a,
    grenze: addMonths(birthDate, a.bisMonaten, tz).getTime(),
    eintraege: [] as VorsorgeEintrag[],
  }))
  const ohneFenster: VorsorgeEintrag[] = []

  for (const eintrag of eintraege) {
    const anker = eintrag.fenster.from ?? eintrag.fenster.to
    if (!anker) {
      ohneFenster.push(eintrag)
      continue
    }
    const abschnitt = grenzen.find((g) => anker.getTime() < g.grenze) ?? grenzen[grenzen.length - 1]!
    abschnitt.eintraege.push(eintrag)
  }

  for (const g of grenzen) {
    g.eintraege.sort(
      (a, b) =>
        (a.fenster.from?.getTime() ?? a.fenster.to?.getTime() ?? 0) -
        (b.fenster.from?.getTime() ?? b.fenster.to?.getTime() ?? 0),
    )
  }

  return {
    abschnitte: grenzen
      .filter((g) => g.eintraege.length > 0)
      .map(({ label, bisMonaten, eintraege }) => ({ label, bisMonaten, eintraege })),
    ohneFenster,
  }
}
