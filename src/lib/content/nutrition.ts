/**
 * Ernaehrung in der Schwangerschaft – was wann besonders zaehlt.
 *
 * Fachliche Grundlage: die oesterreichischen Empfehlungen von AGES und
 * Gesundheitsportal (Folsaeure 400 µg als Supplement bereits vor der
 * Schwangerschaft bis Ende des ersten Drittels; taeglich 100–150 µg Jod
 * zusaetzlich zu jodiertem Speisesalz; empfohlene Eisenzufuhr 30 mg pro Tag;
 * DHA nach aerztlicher Ruecksprache; Koffein hoechstens zwei bis drei Tassen
 * Kaffee bzw. vier Tassen Schwarz- oder Gruentee; Mehrbedarf an Energie erst
 * ab der 13. und noch einmal ab der 28. Woche). Formuliert ist alles selbst.
 *
 * Grundhaltung: keine Verbotsliste und kein „Essen fuer zwei“, sondern ein
 * paar Naehrstoffe, bei denen es sich wirklich lohnt, hinzuschauen.
 */

export const TRIMESTERS = [1, 2, 3] as const
export type Trimester = (typeof TRIMESTERS)[number]

export const TRIMESTER_LABEL: Record<Trimester, string> = {
  1: '1. Trimester',
  2: '2. Trimester',
  3: '3. Trimester',
}

export const TRIMESTER_RANGE: Record<Trimester, string> = {
  1: 'SSW 1–13',
  2: 'SSW 14–27',
  3: 'SSW 28–40',
}

export type Nutrient = {
  key: string
  name: string
  /** In welchen Abschnitten dieser Naehrstoff besonders wichtig ist. */
  trimesters: Trimester[]
  /** Wofuer der Koerper ihn gerade braucht. */
  why: string
  /** Konkrete Lebensmittel, nicht „ausgewogene Ernaehrung“. */
  foods: string[]
  /** Praktischer Kniff, der die Aufnahme verbessert. */
  tip?: string
  /** Wo eine Tablette empfohlen ist – und wo nicht. */
  supplement?: string
}

export const NUTRIENTS: Nutrient[] = [
  {
    key: 'folsaeure',
    name: 'Folsäure',
    trimesters: [1],
    why: 'Das Neuralrohr – aus dem Gehirn und Rückenmark werden – schließt sich in den ersten Wochen. Später kann Folsäure daran nichts mehr ändern.',
    foods: ['Blattspinat', 'Vogerlsalat', 'Brokkoli', 'Linsen und Kichererbsen', 'Vollkornbrot', 'Ei', 'Orangen'],
    tip: 'Folat ist hitze- und wasserempfindlich: Gemüse kurz dünsten statt lange kochen.',
    supplement: '400 µg als Tablette täglich – idealerweise schon vier Wochen vor der Schwangerschaft, jedenfalls bis zum Ende des ersten Drittels.',
  },
  {
    key: 'jod',
    name: 'Jod',
    trimesters: [1, 2, 3],
    why: 'Die Schilddrüse deines Kindes arbeitet erst ab der Mitte der Schwangerschaft selbst – bis dahin lebt sie von deinem Jod. Es steuert die Gehirnentwicklung mit.',
    foods: ['Seefisch (gegart)', 'Milch und Joghurt', 'Eier', 'jodiertes Speisesalz'],
    tip: 'Beim Salz zuhause auf „jodiert“ achten – das ist der einfachste Hebel.',
    supplement: 'Zusätzlich 100 bis 150 µg täglich werden in Österreich empfohlen.',
  },
  {
    key: 'eisen',
    name: 'Eisen',
    trimesters: [2, 3],
    why: 'Dein Blutvolumen steigt um fast die Hälfte, und das Kind legt sich in den letzten Wochen ein eigenes Eisendepot für das erste halbe Jahr an.',
    foods: ['rotes Fleisch (durchgegart)', 'Linsen', 'Haferflocken', 'Kürbiskerne', 'Hirse', 'getrocknete Marillen'],
    tip: 'Vitamin C verdoppelt die Aufnahme: Paprika, Orangensaft oder ein Spritzer Zitrone dazu. Kaffee und Schwarztee bremsen sie – lieber eine Stunde Abstand.',
    supplement: 'Empfohlen sind rund 30 mg am Tag. Eine Tablette nur, wenn das Blutbild sie nahelegt – zu viel Eisen ist nicht besser.',
  },
  {
    key: 'dha',
    name: 'Omega-3 (DHA)',
    trimesters: [2, 3],
    why: 'Gehirn und Netzhaut wachsen im letzten Drittel am schnellsten und bestehen zu großen Teilen aus genau diesem Fett.',
    foods: ['Lachs', 'Makrele', 'Sardinen', 'Rapsöl', 'Leinöl', 'Walnüsse'],
    tip: 'Ein- bis zweimal pro Woche fetter Seefisch deckt den Bedarf. Kalt gepresstes Rapsöl im Salat ist die vegetarische Variante.',
    supplement: 'Ein DHA-Präparat ist sinnvoll, wenn du keinen Fisch isst – vorher mit der Ärztin sprechen.',
  },
  {
    key: 'kalzium',
    name: 'Kalzium',
    trimesters: [2, 3],
    why: 'Das Skelett deines Kindes wird gebaut. Fehlt Kalzium im Essen, holt der Körper es sich aus deinen Knochen.',
    foods: ['Joghurt und Topfen', 'Hartkäse', 'Brokkoli und Grünkohl', 'Mandeln', 'kalziumreiches Mineralwasser'],
    tip: 'Ein Blick aufs Mineralwasser-Etikett lohnt sich: die Werte reichen von fast nichts bis über 500 mg pro Liter.',
  },
  {
    key: 'vitamin-d',
    name: 'Vitamin D',
    trimesters: [1, 2, 3],
    why: 'Ohne Vitamin D nützt das Kalzium wenig – der Körper baut es nicht ein.',
    foods: ['fetter Seefisch', 'Eigelb', 'angereicherte Pflanzendrinks'],
    tip: 'Der Hauptweg ist Tageslicht auf der Haut. In den Wintermonaten reicht das in Österreich nicht aus.',
    supplement: 'Häufig sinnvoll, besonders im Winter – die Dosis gehört zur Ärztin, nicht ins Drogeriemarkt-Bauchgefühl.',
  },
  {
    key: 'b12',
    name: 'Vitamin B12',
    trimesters: [1, 2, 3],
    why: 'Für Blutbildung und Nervensystem. Es kommt praktisch nur in tierischen Lebensmitteln vor.',
    foods: ['Fleisch', 'Fisch', 'Eier', 'Milchprodukte'],
    supplement: 'Bei veganer oder stark vegetarischer Ernährung zwingend – ein Mangel trifft das Kind, nicht dich zuerst.',
  },
  {
    key: 'protein',
    name: 'Eiweiß',
    trimesters: [2, 3],
    why: 'Der Baustoff für alles, was jetzt schnell wächst – und für die Gebärmutter, die mitwächst.',
    foods: ['Topfen', 'Eier', 'Hülsenfrüchte', 'Fleisch und Fisch', 'Haferflocken mit Milch'],
    tip: 'Über den Tag verteilen wirkt besser als eine große Portion am Abend.',
  },
  {
    key: 'ballaststoffe',
    name: 'Ballaststoffe & Flüssigkeit',
    trimesters: [2, 3],
    why: 'Die Verdauung wird durch die Hormone langsamer, und ab dem letzten Drittel drückt das Kind zusätzlich. Verstopfung ist eher die Regel als die Ausnahme.',
    foods: ['Vollkornbrot', 'Haferflocken', 'Pflaumen und Marillen', 'Gemüse', 'Leinsamen'],
    tip: 'Ballaststoffe ohne genug Trinken machen es schlimmer, nicht besser. Ein bis zwei Liter Wasser sind das Minimum.',
  },
]

export type TrimesterFocus = {
  trimester: Trimester
  /** Ueberschrift in einem Satz. */
  headline: string
  /** Was in diesem Abschnitt koerperlich passiert. */
  body: string
  /** Der Energiebedarf – bewusst konkret gegen „fuer zwei essen“. */
  energy: string
  /** Was in diesem Abschnitt am haeufigsten stoert, plus was hilft. */
  trouble: { problem: string; help: string }[]
}

export const TRIMESTER_FOCUS: TrimesterFocus[] = [
  {
    trimester: 1,
    headline: 'Wenig Menge, viel Wirkung',
    body: 'In den ersten Wochen entscheidet sich die Anlage von Gehirn und Rückenmark. Gleichzeitig ist oft genau das die Zeit, in der dir vieles zuwider ist. Beides passt zusammen: Es geht jetzt nicht um Menge, sondern um Folsäure und Jod.',
    energy: 'Kein Mehrbedarf. Dein Kind ist am Ende dieses Abschnitts etwa so schwer wie eine Erdbeere.',
    trouble: [
      {
        problem: 'Übelkeit, besonders morgens',
        help: 'Vor dem Aufstehen etwas Trockenes essen – ein Keks oder Zwieback neben dem Bett. Über den Tag viele kleine Portionen statt drei großer.',
      },
      {
        problem: 'Widerwillen gegen Fleisch, Kaffee oder Gerüche',
        help: 'Nachgeben. Der Körper holt sich das Fehlende später zurück. Wichtig bleibt nur die Folsäure-Tablette.',
      },
      {
        problem: 'Nichts bleibt drin',
        help: 'Wenn du über 24 Stunden nichts bei dir behältst oder abnimmst: bei der Ärztin melden, nicht durchhalten.',
      },
    ],
  },
  {
    trimester: 2,
    headline: 'Die Zeit, in der es leichter geht',
    body: 'Die Übelkeit lässt meist nach, der Bauch drückt noch nicht. Jetzt lohnt es sich, Eisen und Kalzium bewusst unterzubringen, solange Essen wieder Freude macht.',
    energy: 'Ab etwa der 13. Woche kommt ein kleiner Mehrbedarf dazu – im Alltag entspricht das einer zusätzlichen Jause, nicht einer zweiten Portion.',
    trouble: [
      {
        problem: 'Sodbrennen',
        help: 'Kleinere Portionen, nicht direkt vor dem Hinlegen essen, Oberkörper nachts leicht erhöht.',
      },
      {
        problem: 'Heißhunger',
        help: 'Nicht bekämpfen, sondern vorbereiten: Nüsse, Joghurt, Obst griffbereit haben, dann entscheidet nicht die Tankstelle.',
      },
      {
        problem: 'Müdigkeit trotz Schlaf',
        help: 'Kann am Eisen liegen. Beim nächsten Termin das Blutbild ansprechen.',
      },
    ],
  },
  {
    trimester: 3,
    headline: 'Wenig Platz, viel Aufbau',
    body: 'Dein Kind legt jetzt am schnellsten zu und baut sein Eisendepot für das erste halbe Jahr an. Gleichzeitig wird der Magen kleiner, weil kaum noch Platz ist.',
    energy: 'Ab etwa der 28. Woche noch einmal etwas mehr. Ein Löffel gutes Öl über Gemüse oder Suppe reicht dafür oft schon.',
    trouble: [
      {
        problem: 'Kaum noch Platz im Magen',
        help: 'Fünf bis sechs kleine Mahlzeiten. Trinken zwischen den Mahlzeiten statt dazu.',
      },
      {
        problem: 'Verstopfung',
        help: 'Ballaststoffe plus deutlich mehr trinken, dazu Bewegung. Eingeweichte Trockenpflaumen wirken zuverlässiger als jedes Pulver.',
      },
      {
        problem: 'Wassereinlagerungen',
        help: 'Beine hochlegen, weiter normal trinken und salzen. Bei plötzlicher Schwellung in Gesicht oder Händen sofort abklären lassen.',
      },
    ],
  },
]

export function nutrientsFor(trimester: Trimester): Nutrient[] {
  return NUTRIENTS.filter((nutrient) => nutrient.trimesters.includes(trimester))
}

export function focusFor(trimester: Trimester): TrimesterFocus {
  const focus = TRIMESTER_FOCUS.find((entry) => entry.trimester === trimester)
  if (!focus) throw new Error(`Kein Fokus für Trimester ${trimester}`)
  return focus
}

/** Trimester aus der Schwangerschaftswoche. */
export function trimesterForWeek(week: number): Trimester {
  if (week <= 13) return 1
  if (week <= 27) return 2
  return 3
}
