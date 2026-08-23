/**
 * Anlaufstellen und die Regeln, wann sie angeboten werden.
 *
 * Grundhaltung: nicht diagnostizieren, nicht dramatisieren, nicht nerven.
 * Der Hinweis erscheint erst bei einem anhaltenden Muster, nie nach einem
 * einzelnen schlechten Tag, und er kommt höchstens einmal pro Woche.
 */

export type SupportContact = {
  name: string
  phone?: string
  url?: string
  description: string
  /** Rund um die Uhr erreichbar? */
  aroundTheClock?: boolean
}

/** Österreichische Anlaufstellen, kostenlos und vertraulich. */
export const SUPPORT_CONTACTS: SupportContact[] = [
  {
    name: 'Eigene Hebamme',
    description:
      'Die naheliegendste Ansprechperson im ersten Jahr – auch für Fragen, die nichts mit der Geburt zu tun haben.',
  },
  {
    name: 'Frühe Hilfen',
    url: 'https://www.fruehehilfen.at',
    description:
      'Kostenlose und vertrauliche Begleitung für Familien mit kleinen Kindern, in ganz Österreich. Auf Wunsch auch zu Hause.',
  },
  {
    name: 'Rat auf Draht',
    phone: '147',
    description:
      'Beratung für Kinder, Jugendliche und Bezugspersonen. Kostenlos, ohne Vorwahl, rund um die Uhr.',
    aroundTheClock: true,
  },
  {
    name: 'Telefonseelsorge',
    phone: '142',
    url: 'https://www.telefonseelsorge.at',
    description: 'Kostenlos, anonym und rund um die Uhr erreichbar. Auch per Chat und Mail.',
    aroundTheClock: true,
  },
  {
    name: 'Rettung',
    phone: '144',
    description: 'Bei akuter Gefahr für dich oder euer Kind. Nicht zögern.',
    aroundTheClock: true,
  },
]

export type ParentDay = {
  /** "YYYY-MM-DD" */
  date: string
  /** 1 (schlecht) bis 5 (gut). */
  mood: number | null
  energy: number | null
  stress: number | null
  /** Geschlafene Stunden. */
  sleepHours: number | null
}

export type SupportSignal = {
  /** Soll ein Hinweis angezeigt werden? */
  show: boolean
  /** Kurzer, wertfreier Anlass – oder null. */
  reason: string | null
  /** Anzahl der ausgewerteten Tage. */
  sampleSize: number
}

export const SUPPORT_LOOKBACK_DAYS = 14
/** So viele Tage müssen erfasst sein, bevor überhaupt ausgewertet wird. */
export const SUPPORT_MIN_SAMPLES = 5

/**
 * Prüft, ob ein anhaltendes Muster vorliegt.
 *
 * Bewusst konservativ: Es braucht mehrere Tage, und es geht um Dauer, nicht
 * um Tiefe. Ein einzelner sehr schlechter Tag löst nichts aus.
 */
export function evaluateSupportSignal(days: readonly ParentDay[]): SupportSignal {
  const recent = days.filter((day) => day.mood !== null || day.sleepHours !== null)
  if (recent.length < SUPPORT_MIN_SAMPLES) {
    return { show: false, reason: null, sampleSize: recent.length }
  }

  const moods = recent.map((day) => day.mood).filter((value): value is number => value !== null)
  const stress = recent.map((day) => day.stress).filter((value): value is number => value !== null)
  const sleep = recent
    .map((day) => day.sleepHours)
    .filter((value): value is number => value !== null)

  // Mindestens fünf Tage mit niedriger Stimmung im Beobachtungszeitraum.
  const lowMoodDays = moods.filter((value) => value <= 2).length
  if (lowMoodDays >= 5) {
    return {
      show: true,
      reason: `An ${lowMoodDays} der letzten Tage war die Stimmung niedrig.`,
      sampleSize: recent.length,
    }
  }

  // Anhaltend wenig Schlaf über mehrere Tage.
  const shortSleepDays = sleep.filter((value) => value < 5).length
  if (shortSleepDays >= 5) {
    return {
      show: true,
      reason: `An ${shortSleepDays} der letzten Tage kamen weniger als fünf Stunden Schlaf zusammen.`,
      sampleSize: recent.length,
    }
  }

  // Dauerhaft hohe Belastung.
  const highStressDays = stress.filter((value) => value >= 4).length
  if (highStressDays >= 6) {
    return {
      show: true,
      reason: `An ${highStressDays} der letzten Tage war die Belastung hoch.`,
      sampleSize: recent.length,
    }
  }

  return { show: false, reason: null, sampleSize: recent.length }
}

/** Wurde der Hinweis in den letzten sieben Tagen schon gezeigt? */
export function shouldSuppress(lastShownAt: Date | null, now: Date = new Date()): boolean {
  if (!lastShownAt) return false
  return now.getTime() - lastShownAt.getTime() < 7 * 86400000
}
