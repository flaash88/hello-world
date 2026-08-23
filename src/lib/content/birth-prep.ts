/**
 * Geburtsvorbereitung im letzten Abschnitt.
 *
 * Aufgeteilt in zwei Dinge: erledigen (organisatorisch, mit Zeitpunkt) und
 * ueben (koerperlich, taeglich ein paar Minuten). Die Zeitpunkte sind die in
 * Oesterreich ueblichen Empfehlungen aus der Hebammenbetreuung – etwa
 * Dammmassage ab rund der 34. Woche und geburtsvorbereitende Akupunktur ab
 * der 36. Woche. Sie sind Orientierung, nicht Vorschrift: Was fuer euch gilt,
 * sagt eure Hebamme.
 *
 * Die Uebungen sind bewusst ruhig gehalten. Es geht nicht um Fitness, sondern
 * um zwei Dinge, die unter der Geburt zaehlen: Beweglichkeit im Becken und
 * die Faehigkeit, bewusst loszulassen.
 */

export type PrepTask = {
  key: string
  section: string
  label: string
  /** Ab wann sinnvoll – als Text, weil es Spannen sind. */
  timing: string
  /** Ab welcher SSW die Aufgabe angezeigt wird. */
  fromWeek: number
  note?: string
}

export const PREP_SECTIONS = ['Körper', 'Organisieren', 'Klinik & Wege', 'Für danach'] as const

export const PREP_TASKS: PrepTask[] = [
  // ------------------------------------------------------------------ Körper
  {
    key: 'dammmassage',
    section: 'Körper',
    label: 'Dammmassage beginnen',
    timing: 'ab etwa SSW 34, täglich 5 Minuten',
    fromWeek: 34,
    note: 'Mit warmem Öl, ohne Druck bis zum Schmerz. Sie macht das Gewebe dehnbarer und dich mit dem Gefühl vertraut. Bei vorzeitigen Wehen oder Infektionen vorher fragen.',
  },
  {
    key: 'akupunktur',
    section: 'Körper',
    label: 'Geburtsvorbereitende Akupunktur anfragen',
    timing: 'ab SSW 36, meist wöchentlich',
    fromWeek: 35,
    note: 'Wird von vielen Hebammen angeboten. Sie soll den Muttermund reifen lassen und die Eröffnungsphase verkürzen. Termine früh ausmachen, die Plätze sind knapp.',
  },
  {
    key: 'beckenboden',
    section: 'Körper',
    label: 'Beckenboden bewusst lockern üben',
    timing: 'täglich, ab jetzt',
    fromWeek: 30,
    note: 'Im letzten Abschnitt zählt Loslassen mehr als Anspannen. Das Anspannen kommt im Wochenbett wieder dran.',
  },
  {
    key: 'atmung',
    section: 'Körper',
    label: 'Atmung und Tönen ausprobieren',
    timing: 'ein paar Minuten täglich',
    fromWeek: 32,
    note: 'Tiefe Töne entspannen den Beckenboden – hohes Pressen macht das Gegenteil. Was albern klingt, hilft unter der Geburt wirklich.',
  },

  // ------------------------------------------------------------ Organisieren
  {
    key: 'kliniktasche',
    section: 'Organisieren',
    label: 'Kliniktasche fertig packen',
    timing: 'bis SSW 36',
    fromWeek: 33,
    note: 'Ab jetzt kann es losgehen. Die Liste dafür steht in der App unter Schwangerschaft → Kliniktasche.',
  },
  {
    key: 'geburtsplan',
    section: 'Organisieren',
    label: 'Geburtsplan aufschreiben',
    timing: 'SSW 34–37',
    fromWeek: 34,
    note: 'Eine halbe Seite reicht: Was ist euch wichtig, was auf keinen Fall, wer entscheidet, wenn es schnell gehen muss. Kein Vertrag, sondern ein Gesprächsanfang.',
  },
  {
    key: 'geburtsvorbereitungskurs',
    section: 'Organisieren',
    label: 'Geburtsvorbereitungskurs abschließen',
    timing: 'meist SSW 28–36',
    fromWeek: 28,
    note: 'Auch Partnerkurse sind erfahrungsgemäß die investierten Abende wert.',
  },
  {
    key: 'namen',
    section: 'Organisieren',
    label: 'Namen auf zwei, drei eingrenzen',
    timing: 'bis SSW 38',
    fromWeek: 34,
    note: 'Der Vorname muss binnen eines Monats nach der Geburt beim Standesamt stehen. Im Kreißsaal ist keine gute Zeit für die Grundsatzdiskussion.',
  },

  // ----------------------------------------------------------- Klinik & Wege
  {
    key: 'klinik-anmelden',
    section: 'Klinik & Wege',
    label: 'In der Geburtsklinik anmelden',
    timing: 'SSW 30–36',
    fromWeek: 30,
    note: 'Viele Häuser wollen eine Voranmeldung samt Aufnahmegespräch. Kreißsaalführung gleich mitnehmen.',
  },
  {
    key: 'anfahrt',
    section: 'Klinik & Wege',
    label: 'Anfahrt einmal durchspielen',
    timing: 'ab SSW 35',
    fromWeek: 35,
    note: 'Route, Parkplatz, welcher Eingang nachts offen ist, wo man klingelt. Einmal nüchtern geklärt spart Panik.',
  },
  {
    key: 'kindersitz',
    section: 'Klinik & Wege',
    label: 'Babyschale einbauen und ausprobieren',
    timing: 'bis SSW 36',
    fromWeek: 34,
    note: 'Ohne Babyschale keine Heimfahrt. Einmal vorher einbauen, nicht mit dem Neugeborenen am Arm.',
  },
  {
    key: 'plan-b',
    section: 'Klinik & Wege',
    label: 'Plan B für die Fahrt festlegen',
    timing: 'ab SSW 36',
    fromWeek: 36,
    note: 'Wer fährt, wenn Papa nicht da oder nicht fahrtauglich ist? Nummer bereitlegen.',
  },

  // ---------------------------------------------------------------- Für danach
  {
    key: 'hebamme-nachsorge',
    section: 'Für danach',
    label: 'Hebamme für das Wochenbett fixieren',
    timing: 'so früh wie möglich',
    fromWeek: 20,
    note: 'Die Nachsorge zuhause ist das Wertvollste am Wochenbett – und in vielen Regionen früh ausgebucht.',
  },
  {
    key: 'vorkochen',
    section: 'Für danach',
    label: 'Tiefkühlvorrat anlegen',
    timing: 'SSW 35–38',
    fromWeek: 35,
    note: 'Sechs bis acht Portionen reichen für die erste Woche. Rezepte dafür stehen unter Wissen → Rezepte fürs Wochenbett.',
  },
  {
    key: 'besuchsregel',
    section: 'Für danach',
    label: 'Besuchsregeln vorher vereinbaren',
    timing: 'ab SSW 36',
    fromWeek: 36,
    note: 'Wer darf wann kommen, wie lange, und wer sagt ab? Einmal zu zweit entschieden, muss es hinterher niemand allein verteidigen.',
  },
  {
    key: 'einkauf',
    section: 'Für danach',
    label: 'Wochenbett-Einkauf erledigen',
    timing: 'bis SSW 37',
    fromWeek: 35,
    note: 'Binden für den Wochenfluss, Stilleinlagen, Wundsalbe, Tee, Haferflocken, Klopapier im Übermaß.',
  },
]

export type PrepExercise = {
  key: string
  title: string
  goal: string
  material: string
  steps: string[]
  durationLabel: string
  /** Ab wann sinnvoll. */
  fromWeek: number
  note?: string
}

export const PREP_EXERCISES: PrepExercise[] = [
  {
    key: 'katze-kuh',
    title: 'Katze und Kuh',
    goal: 'Beweglichkeit in der Lendenwirbelsäule, Entlastung für den unteren Rücken',
    material: 'Matte oder Teppich, bei empfindlichen Knien ein Polster',
    steps: [
      'In den Vierfüßlerstand: Hände unter den Schultern, Knie unter den Hüften.',
      'Einatmen: Steißbein und Brustbein heben, der Rücken wird lang und leicht hohl.',
      'Ausatmen: Rücken runden, Kinn Richtung Brust, Bauchnabel nach innen ziehen.',
      'Acht bis zehn Mal langsam im Atemrhythmus wechseln – nie schneller als der Atem.',
    ],
    durationLabel: '3 Minuten',
    fromWeek: 12,
    note: 'Geht bis zum Schluss und ist auch unter der Geburt eine der beliebtesten Positionen.',
  },
  {
    key: 'beckenkreisen',
    title: 'Beckenkreisen im Vierfüßlerstand',
    goal: 'Das Becken lockern und dem Kind Raum geben, sich gut einzustellen',
    material: 'Matte, optional ein Gymnastikball zum Aufstützen',
    steps: [
      'Vierfüßlerstand einnehmen, Gewicht gleichmäßig auf Händen und Knien.',
      'Das Becken langsam in großen Kreisen bewegen, als würdest du mit dem Steißbein malen.',
      'Zehn Kreise in eine Richtung, dann zehn in die andere.',
      'Zwischendurch die Schultern locker hängen lassen.',
    ],
    durationLabel: '5 Minuten',
    fromWeek: 20,
    note: 'Auf dem Ball sitzend funktioniert dieselbe Bewegung, wenn die Knie nicht mögen.',
  },
  {
    key: 'schneidersitz',
    title: 'Aufrechter Schneidersitz',
    goal: 'Innenseiten der Oberschenkel dehnen, Haltung aufrichten',
    material: 'Ein festes Kissen oder eine gefaltete Decke',
    steps: [
      'Auf die Kante des Kissens setzen, sodass die Hüften höher sind als die Knie.',
      'Beine locker kreuzen, Knie sinken lassen, ohne sie zu drücken.',
      'Scheitel nach oben schieben, Schultern nach hinten unten.',
      'Fünf ruhige Atemzüge, dann die Beinstellung tauschen.',
    ],
    durationLabel: '3 Minuten',
    fromWeek: 12,
    note: 'Der einfachste Weg, den Rücken zu entlasten – geht auch abends vor dem Fernseher.',
  },
  {
    key: 'schmetterling',
    title: 'Schmetterling',
    goal: 'Beckenboden und Leisten weich machen',
    material: 'Kissen unter dem Gesäß, optional zwei Polster unter die Knie',
    steps: [
      'Aufrecht sitzen, Fußsohlen aneinanderlegen, Fersen nicht zu nah an den Körper.',
      'Knie locker Richtung Boden sinken lassen – Polster darunter nehmen den Zug raus.',
      'Aufrecht bleiben, mit jedem Ausatmen ein Stück weicher werden.',
      'Zehn Atemzüge halten, danach die Beine ausstrecken und ausschütteln.',
    ],
    durationLabel: '4 Minuten',
    fromWeek: 20,
    note: 'Nicht federn oder drücken. Dehnung entsteht hier durch Zeit, nicht durch Kraft.',
  },
  {
    key: 'tiefe-hocke',
    title: 'Tiefe Hocke mit Stütze',
    goal: 'Beckenausgang weiten, Schwerkraft nutzen',
    material: 'Wand im Rücken oder ein Hocker unter dem Gesäß',
    steps: [
      'Füße etwas weiter als hüftbreit, Zehen leicht nach außen.',
      'Langsam in die Hocke sinken, Fersen möglichst am Boden lassen.',
      'Ellbogen innen an die Knie, Hände vor der Brust – so bleibt der Rücken lang.',
      'Fünf Atemzüge bleiben, dann an der Wand hochschieben oder auf allen vieren aufstehen.',
    ],
    durationLabel: '2 Minuten',
    fromWeek: 34,
    note: 'Vorher mit der Hebamme abklären: Bei tiefliegender Plazenta, vorzeitigen Wehen oder Beckenendlage ist die Hocke nicht für jede geeignet.',
  },
  {
    key: 'kindhaltung',
    title: 'Weite Kindhaltung',
    goal: 'Rücken entlasten, zur Ruhe kommen',
    material: 'Matte, ein bis zwei Kissen',
    steps: [
      'Aus dem Vierfüßlerstand die Knie weit öffnen, große Zehen berühren sich.',
      'Das Gesäß Richtung Fersen schieben, Bauch bekommt zwischen den Knien Platz.',
      'Oberkörper auf einem Kissenstapel ablegen, Kopf zur Seite drehen.',
      'Zehn bis zwanzig Atemzüge einfach liegen bleiben.',
    ],
    durationLabel: '5 Minuten',
    fromWeek: 12,
    note: 'Die beste Position für den Moment, in dem der Rücken nicht mehr mag.',
  },
  {
    key: 'seitliche-dehnung',
    title: 'Seitliche Dehnung im Sitzen',
    goal: 'Platz zwischen Rippen und Becken schaffen – gegen das Druckgefühl unter den Rippen',
    material: 'Kissen zum Sitzen',
    steps: [
      'Aufrecht im Schneidersitz, rechte Hand neben dem Körper am Boden.',
      'Linken Arm einatmend über den Kopf führen und nach rechts neigen.',
      'Drei Atemzüge halten, dabei in die gedehnte Seite atmen.',
      'Aufrichten und die Seite wechseln.',
    ],
    durationLabel: '3 Minuten',
    fromWeek: 24,
  },
  {
    key: 'beckenboden-loslassen',
    title: 'Beckenboden wahrnehmen und loslassen',
    goal: 'Bewusst öffnen können – das ist unter der Geburt wichtiger als jede Kraftübung',
    material: 'Seitenlage mit Kissen zwischen den Knien',
    steps: [
      'Bequem auf die Seite legen, Kissen zwischen die Knie.',
      'Einatmen und den Beckenboden nur leicht anspannen, als würdest du eine Bewegung andeuten.',
      'Ausatmen und deutlich länger loslassen als du angespannt hast – das Loslassen ist die eigentliche Übung.',
      'Zehn Wiederholungen, dabei Bauch, Kiefer und Schultern locker lassen.',
    ],
    durationLabel: '5 Minuten',
    fromWeek: 24,
    note: 'Kiefer und Beckenboden hängen zusammen: Wenn der Mund locker ist, ist es der Beckenboden meistens auch.',
  },
  {
    key: 'atmung-4-6',
    title: 'Ruhiger Atem: kurz ein, lang aus',
    goal: 'Ein Werkzeug für die Wehen – und für jede Nacht, in der du wachliegst',
    material: 'Nichts',
    steps: [
      'Bequem sitzen oder in Seitenlage liegen, eine Hand auf den Bauch.',
      'Vier Sekunden durch die Nase einatmen, der Bauch hebt sich.',
      'Sechs Sekunden durch den leicht geöffneten Mund ausatmen.',
      'Zehn Runden. Wenn Gedanken kommen: mitzählen hilft.',
    ],
    durationLabel: '3 Minuten',
    fromWeek: 12,
    note: 'Der lange Ausatem ist der Trick – er ist das Signal an den Körper, dass keine Gefahr besteht.',
  },
  {
    key: 'toenen',
    title: 'Tönen',
    goal: 'Beckenboden über tiefe Töne entspannen',
    material: 'Ein Raum, in dem es dir nicht peinlich ist',
    steps: [
      'Aufrecht sitzen oder in die Hocke gehen, Kiefer locker.',
      'Ausatmend ein tiefes „Ooo“ oder „Uuu“ summen, so lang der Atem reicht.',
      'Spüren, wie die Vibration bis ins Becken geht.',
      'Fünf bis zehn Töne, zwischendurch normal atmen.',
    ],
    durationLabel: '3 Minuten',
    fromWeek: 30,
    note: 'Klingt seltsam, ist aber das, was Hebammen unter der Geburt als Erstes vorschlagen. Einmal geübt fällt es dann leichter.',
  },
  {
    key: 'entspannungslage',
    title: 'Entspannungslage mit Körperreise',
    goal: 'Zur Ruhe kommen, wenn der Kopf nicht abschaltet',
    material: 'Seitenlage, Kissen unter Kopf, Bauch und zwischen den Knien',
    steps: [
      'Linke Seitenlage einnehmen und alles unterpolstern, was hängt.',
      'Von den Füßen aufwärts der Reihe nach jede Körperregion kurz anspannen und wieder loslassen.',
      'Oben angekommen ein paar Minuten einfach liegen bleiben.',
      'Zum Schluss Hände auf den Bauch legen und dem Kind einen Moment zuhören.',
    ],
    durationLabel: '10 Minuten',
    fromWeek: 20,
    note: 'Linke Seite deshalb, weil so die große Hohlvene frei bleibt und mehr Blut zum Kind kommt.',
  },
]

export function prepTasksFor(week: number): PrepTask[] {
  return PREP_TASKS.filter((task) => week >= task.fromWeek)
}

export function prepExercisesFor(week: number): PrepExercise[] {
  return PREP_EXERCISES.filter((exercise) => week >= exercise.fromWeek)
}
