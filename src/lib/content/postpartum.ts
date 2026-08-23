/**
 * Wochenbett – die ersten sechs bis acht Wochen.
 *
 * Fachliche Grundlage: Gesundheitsportal des Bundes zu Rueckbildung,
 * Wochenfluss und Stimmungstiefs nach der Geburt sowie die in Oesterreich
 * uebliche Hebammen-Nachsorge. Formuliert ist alles selbst.
 *
 * Haltung: Das Wochenbett ist kein Urlaub und keine Krankheit, sondern eine
 * Heilungsphase mit einem Neugeborenen obendrauf. Diese Seite sagt, was
 * normal ist – und benennt klar die Zeichen, bei denen man nicht abwartet.
 */

export type PpSection = {
  key: string
  title: string
  body: string
  points?: string[]
}

export const PP_PHASES: PpSection[] = [
  {
    key: 'tage-1-10',
    title: 'Tag 1 bis 10: liegen',
    body: 'Die Gebärmutter ist innen eine Wunde von der Größe eines Handtellers. Alles, was aufrechtes Herumlaufen bedeutet, verzögert die Heilung und verstärkt die Blutung.',
    points: [
      'So viel wie möglich liegen, das Kind neben dir statt im anderen Zimmer.',
      'Aufstehen zum Klo und zum Duschen, sonst wenig.',
      'Hausarbeit gehört jetzt anderen. Wer helfen will, bekommt eine konkrete Aufgabe: Wäsche, Einkauf, Kochen.',
      'Die Hebamme kommt in dieser Zeit regelmäßig nach Hause – nutzt die Besuche für alle Fragen, auch die unangenehmen.',
    ],
  },
  {
    key: 'woche-2-3',
    title: 'Woche 2 und 3: aufstehen',
    body: 'Der Aktionsradius wächst langsam – Wohnung, kurzer Spaziergang, ein Besuch. Der Körper meldet zuverlässig zurück, wenn es zu viel war: mehr Wochenfluss, wieder hellrot.',
    points: [
      'Das ist das Signal, einen Gang zurückzuschalten, kein Grund zur Panik.',
      'Nichts Schwereres heben als das Baby.',
      'Kein Vollbad, kein Schwimmbad, solange der Wochenfluss läuft.',
    ],
  },
  {
    key: 'woche-4-8',
    title: 'Woche 4 bis 8: zurückkommen',
    body: 'Der Wochenfluss versiegt, die Gebärmutter hat sich weitgehend zurückgebildet. Jetzt beginnt das, was man wirklich Rückbildung nennt.',
    points: [
      'Mit dem Rückbildungskurs beginnen die meisten sechs bis acht Wochen nach der Geburt, nach Kaiserschnitt später – Freigabe bei der Nachuntersuchung holen.',
      'Vorher nur wahrnehmen und atmen, keine Sit-ups und kein Joggen.',
      'Die Nachuntersuchung findet üblicherweise sechs bis acht Wochen nach der Geburt statt.',
    ],
  },
]

export const PP_BODY: PpSection[] = [
  {
    key: 'wochenfluss',
    title: 'Wochenfluss',
    body: 'Die Wundheilung der Gebärmutter, sichtbar gemacht. Er dauert insgesamt vier bis sechs Wochen und verändert Farbe und Menge.',
    points: [
      'Zuerst kräftig rot, dann bräunlich, später gelblich und zuletzt weißlich.',
      'Binden statt Tampons oder Menstruationstasse – nichts einführen, solange er läuft.',
      'Beim Stillen wird er kurz stärker, das gehört dazu.',
    ],
  },
  {
    key: 'nachwehen',
    title: 'Nachwehen',
    body: 'Krampfartiges Ziehen, vor allem während des Stillens. Es ist die Gebärmutter, die sich zusammenzieht – unangenehm, aber genau das, was passieren soll.',
    points: [
      'Beim zweiten Kind meist deutlich stärker als beim ersten.',
      'Wärme auf dem Bauch hilft, ebenso die Blase regelmäßig leeren.',
      'Nach ein paar Tagen ist es vorbei.',
    ],
  },
  {
    key: 'damm',
    title: 'Dammnaht und Beckenboden',
    body: 'Eine Naht heilt in ein bis zwei Wochen, unangenehm ist vor allem das Sitzen.',
    points: [
      'Nach jedem Toilettengang mit lauwarmem Wasser abspülen und trocken tupfen.',
      'Luft an die Wunde lassen, im Liegen ruhig einmal ohne alles.',
      'Auf einem Stillkissen oder seitlich sitzen entlastet.',
      'Beim ersten Stuhlgang mit einer Binde oder der Hand gegen den Damm gegenhalten – das nimmt die Angst.',
    ],
  },
  {
    key: 'kaiserschnitt',
    title: 'Nach dem Kaiserschnitt',
    body: 'Eine Bauch-Operation mit Neugeborenem. Die Heilung dauert länger, und das ist kein persönliches Versagen.',
    points: [
      'Über die Seite aufstehen: erst rollen, dann mit den Armen hochdrücken, Bauch nicht anspannen.',
      'Beim Husten oder Lachen mit der Hand oder einem Kissen gegen die Narbe halten.',
      'Schmerzmittel nehmen, solange sie nötig sind – Schmerzen halten dich vom Bewegen ab und das verzögert alles.',
      'Narbenpflege erst, wenn alles verschlossen ist, dann täglich sanft massieren.',
    ],
  },
]

export type PpMood = {
  key: string
  title: string
  body: string
  points: string[]
}

export const PP_MOOD: PpMood[] = [
  {
    key: 'babyblues',
    title: 'Babyblues',
    body: 'Zwischen Tag drei und fünf kippt bei den meisten die Stimmung: Weinen ohne Anlass, Dünnhäutigkeit, Überforderung. Das ist der Hormonabfall nach dem Milcheinschuss und geht nach Tagen von selbst vorbei.',
    points: [
      'Betrifft rund die Hälfte bis zwei Drittel aller Frauen – es ist die Regel, nicht die Ausnahme.',
      'Was hilft: Schlaf, Essen, jemand, der zuhört, ohne es lösen zu wollen.',
    ],
  },
  {
    key: 'depression',
    title: 'Wenn es nicht vorbeigeht',
    body: 'Hält die gedrückte Stimmung länger als zwei Wochen an oder wird schlimmer statt besser, ist es kein Babyblues mehr. Eine Wochenbettdepression ist häufig und gut behandelbar – aber nicht durch Zusammenreißen.',
    points: [
      'Anhaltende Traurigkeit oder Leere, auch wenn es gerade ruhig ist.',
      'Keine Freude am Kind, das Gefühl, keine Bindung aufzubauen.',
      'Schlaflosigkeit, obwohl das Kind schläft.',
      'Ständige Angst, etwas falsch zu machen, oder Gedanken, dass alle ohne dich besser dran wären.',
      'Sprich mit der Hebamme, der Hausärztin oder ruf bei den Frühen Hilfen an. Die Nummern stehen in der App im Eltern-Bereich.',
    ],
  },
  {
    key: 'partner',
    title: 'Für den Partner',
    body: 'Die konkreteste Hilfe ist nicht Trösten, sondern Übernehmen. Was in dieser Zeit wirklich zählt, ist unspektakulär.',
    points: [
      'Essen und Trinken hinstellen, ungefragt, auch nachts.',
      'Besuche abwehren und Termine koordinieren.',
      'Das Baby nach dem Stillen übernehmen, damit sie am Stück schlafen kann.',
      'Einmal am Tag fragen, wie es ihr geht – und die Antwort aushalten, ohne sie zu reparieren.',
      'Auch auf dich schauen: Der Check-in im Eltern-Bereich ist für euch beide da.',
    ],
  },
]

/** Rote Zeichen: hier wird nicht abgewartet und nicht gegoogelt. */
export const PP_RED_FLAGS: string[] = [
  'Fieber über 38 °C',
  'Blutung, die eine Binde in einer Stunde durchtränkt, oder Abgang großer Klumpen',
  'Übel riechender Wochenfluss',
  'Starke, einseitige Schmerzen oder Schwellung im Bein',
  'Starke Kopfschmerzen mit Sehstörungen, Augenflimmern oder Schmerzen im Oberbauch',
  'Atemnot oder Schmerzen in der Brust',
  'Rote, überwärmte Brust mit Fieber und Grippegefühl',
  'Gedanken, dir oder dem Kind etwas anzutun',
]

export const PP_RED_FLAG_NOTE =
  'Bei diesen Zeichen sofort die Hebamme, die Ärztin oder die Klinik anrufen – bei Atemnot, starker Blutung oder Gedanken an Selbstverletzung die Rettung unter 144. Lieber einmal zu viel angerufen als einmal zu spät.'
