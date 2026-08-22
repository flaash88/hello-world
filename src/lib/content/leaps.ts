/**
 * Entwicklungssprünge ("Schübe").
 *
 * Die Zeitfenster orientieren sich an der in der Elternliteratur verbreiteten
 * Einteilung mentaler Entwicklungssprünge im ersten Lebensjahr, gerechnet ab
 * dem errechneten Termin (nicht ab dem Geburtstag). Die Beschreibungen sind
 * eigenformuliert.
 *
 * Wichtig fuer die Einordnung: Die Sprungtheorie ist wissenschaftlich
 * umstritten – Studien konnten die behaupteten festen Zeitpunkte nicht
 * bestaetigen. Als Orientierung, warum eine anstrengende Woche anstrengend
 * ist, taugt sie trotzdem. Genau so wird sie hier auch praesentiert.
 */

export type Leap = {
  id: number
  /** Beginn und Ende in Wochen ab errechnetem Termin. */
  fromWeek: number
  toWeek: number
  title: string
  /** Was sich in dieser Phase neu erschliesst. */
  theme: string
  /** Typische Anzeichen im Verhalten. */
  signs: string[]
  /** Was danach neu dazukommt. */
  gains: string[]
  /** Wie lange die unruhige Phase ueblicherweise dauert. */
  durationLabel: string
}

export const LEAPS: Leap[] = [
  {
    id: 1,
    fromWeek: 4,
    toWeek: 5,
    title: 'Die Welt wird schärfer',
    theme: 'Sinneseindrücke werden erstmals als getrennte Reize wahrgenommen statt als Rauschen.',
    signs: [
      'weint häufiger und lässt sich schwerer beruhigen',
      'will ständig getragen werden',
      'trinkt unruhiger oder häufiger',
      'schläft schlechter ein',
    ],
    gains: [
      'schaut Gesichter länger an',
      'reagiert deutlicher auf Geräusche',
      'erstes soziales Lächeln rückt näher',
    ],
    durationLabel: 'etwa eine Woche',
  },
  {
    id: 2,
    fromWeek: 7,
    toWeek: 9,
    title: 'Muster erkennen',
    theme: 'Wiederkehrende Formen und Abläufe werden als Muster erkannt – die eigene Hand zum Beispiel.',
    signs: [
      'starrt ausdauernd auf die eigenen Hände',
      'quengelt am späten Nachmittag stärker',
      'braucht mehr Körperkontakt',
    ],
    gains: [
      'entdeckt Hände und Füße als Teil von sich',
      'greift gezielter',
      'lauter und vielfältiger in den Lauten',
    ],
    durationLabel: 'ein bis zwei Wochen',
  },
  {
    id: 3,
    fromWeek: 11,
    toWeek: 12,
    title: 'Fließende Übergänge',
    theme: 'Bewegungen und Geräusche werden als fließend statt als abgehackt wahrgenommen.',
    signs: [
      'wechselhafte Stimmung',
      'Appetit schwankt',
      'wacht nachts häufiger auf',
    ],
    gains: [
      'Bewegungen werden geschmeidiger',
      'lacht laut',
      'verfolgt Gegenstände mit den Augen über die Körpermitte',
    ],
    durationLabel: 'etwa eine Woche',
  },
  {
    id: 4,
    fromWeek: 14,
    toWeek: 19,
    title: 'Ereignisse verstehen',
    theme: 'Kurze Abfolgen werden als zusammenhängendes Ereignis begriffen – Ursache und Wirkung.',
    signs: [
      'deutlich anhänglicher',
      'schläft schlechter, oft die bekannte Vier-Monats-Regression',
      'weniger Appetit',
      'fremdelt in Ansätzen',
    ],
    gains: [
      'greift gezielt und führt zum Mund',
      'dreht sich',
      'erkennt Zusammenhänge zwischen eigener Handlung und Reaktion',
    ],
    durationLabel: 'zwei bis fünf Wochen',
  },
  {
    id: 5,
    fromWeek: 22,
    toWeek: 26,
    title: 'Beziehungen zwischen Dingen',
    theme: 'Abstände und Verhältnisse werden begreifbar: darin, darauf, dahinter, weit weg.',
    signs: [
      'starke Trennungsangst',
      'schlechter Schlaf',
      'will nicht abgelegt werden',
      'stimmungsschwankend',
    ],
    gains: [
      'sucht versteckte Gegenstände',
      'sitzt freier',
      'beginnt sich fortzubewegen',
    ],
    durationLabel: 'drei bis fünf Wochen',
  },
  {
    id: 6,
    fromWeek: 33,
    toWeek: 37,
    title: 'Dinge einordnen',
    theme: 'Gegenstände und Menschen werden Kategorien zugeordnet: Tiere, Essen, vertraut, fremd.',
    signs: [
      'fremdelt stark',
      'wird schneller frustriert',
      'schläft unruhig',
      'klammert tagsüber',
    ],
    gains: [
      'sortiert und vergleicht',
      'ahmt gezielt nach',
      'erste Wörter mit Bedeutung rücken näher',
    ],
    durationLabel: 'drei bis vier Wochen',
  },
  {
    id: 7,
    fromWeek: 41,
    toWeek: 46,
    title: 'Abfolgen begreifen',
    theme: 'Handlungen mit mehreren Schritten werden als Reihenfolge verstanden.',
    signs: [
      'testet Grenzen',
      'wechselt schnell zwischen Stimmungen',
      'will bei allem dabei sein',
    ],
    gains: [
      'steckt Dinge ineinander',
      'ahmt Alltagshandlungen nach',
      'versteht einfache Aufforderungen',
    ],
    durationLabel: 'drei bis fünf Wochen',
  },
  {
    id: 8,
    fromWeek: 51,
    toWeek: 54,
    title: 'Programme statt Schritte',
    theme: 'Größere Abläufe werden als Ganzes verstanden: essen, aufräumen, anziehen.',
    signs: [
      'starker eigener Wille',
      'Wutanfälle nehmen zu',
      'sucht abwechselnd Nähe und Abstand',
    ],
    gains: [
      'hilft beim Anziehen mit',
      'spielt Alltagsszenen nach',
      'erste freie Schritte',
    ],
    durationLabel: 'drei bis vier Wochen',
  },
  {
    id: 9,
    fromWeek: 59,
    toWeek: 64,
    title: 'Nach eigenen Regeln',
    theme: 'Das Kind entwickelt eigene Vorstellungen davon, wie etwas ablaufen soll.',
    signs: [
      'besteht auf Ritualen',
      'reagiert heftig auf Abweichungen',
      'wechselhafte Laune',
    ],
    gains: [
      'wählt bewusst aus',
      'verhandelt in Ansätzen',
      'Wortschatz wächst',
    ],
    durationLabel: 'drei bis sechs Wochen',
  },
  {
    id: 10,
    fromWeek: 70,
    toWeek: 76,
    title: 'Systeme verstehen',
    theme: 'Regeln werden als etwas erkannt, das man anwenden oder brechen kann.',
    signs: [
      'testet Grenzen systematisch',
      'Trotz nimmt zu',
      'schläft unruhiger',
    ],
    gains: [
      'versteht Regeln und Konsequenzen',
      'zeigt erste Ansätze von Mitgefühl',
      'Zweiwortsätze entstehen',
    ],
    durationLabel: 'vier bis sechs Wochen',
  },
]

export type ActiveLeap = { leap: Leap; progress: number; weeksIn: number }

/**
 * Findet den Sprung, dessen Fenster gerade laeuft. Gerechnet wird ab dem
 * errechneten Termin: Bei einer Fruehgeburt verschieben sich die Fenster
 * entsprechend nach hinten.
 */
export function activeLeap(correctedWeeks: number): ActiveLeap | null {
  const leap = LEAPS.find((entry) => correctedWeeks >= entry.fromWeek && correctedWeeks <= entry.toWeek)
  if (!leap) return null

  const span = leap.toWeek - leap.fromWeek + 1
  const weeksIn = correctedWeeks - leap.fromWeek
  return { leap, weeksIn, progress: span <= 0 ? 1 : Math.min(1, (weeksIn + 1) / span) }
}

/** Der naechste anstehende Sprung samt Wochen bis dahin. */
export function nextLeap(correctedWeeks: number): { leap: Leap; weeksUntil: number } | null {
  const leap = LEAPS.find((entry) => entry.fromWeek > correctedWeeks)
  return leap ? { leap, weeksUntil: leap.fromWeek - correctedWeeks } : null
}
