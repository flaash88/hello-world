/**
 * Behoerdenwege und Meldepflichten in Oesterreich rund um die Geburt.
 *
 * Recherchiert im August 2026 auf oesterreich.gv.at, bei der Arbeiterkammer,
 * der OeGK und dem Gesundheitsportal; die Formulierungen sind eigene. Fristen
 * und Betraege aendern sich – deshalb steht auf der Seite ein sichtbarer
 * Stand, und jeder Eintrag nennt die zustaendige Stelle, bei der im Zweifel
 * die verbindliche Auskunft liegt.
 *
 * Wichtig fuer die Terminologie: Der Mutter-Kind-Pass heisst seit der
 * Digitalisierung Eltern-Kind-Pass. Beide Begriffe sind hier absichtlich
 * genannt, weil im Alltag noch beide kursieren.
 */

export const ADMIN_STAND = 'August 2026'

export const ADMIN_PHASES = ['vor', 'nach'] as const
export type AdminPhase = (typeof ADMIN_PHASES)[number]

export const ADMIN_PHASE_LABEL: Record<AdminPhase, string> = {
  vor: 'Vor der Geburt',
  nach: 'Nach der Geburt',
}

export type AdminTask = {
  key: string
  phase: AdminPhase
  section: string
  label: string
  /** Die Frist in einem Satz – das Wichtigste am Eintrag. */
  deadline: string
  /** Wer zustaendig ist. */
  authority: string
  /** Was mitzunehmen oder vorzubereiten ist. */
  needs?: string[]
  note?: string
  /** Erledigt sich in der Regel von selbst – trotzdem gut zu wissen. */
  automatic?: boolean
}

export const ADMIN_TASKS: AdminTask[] = [
  // =========================================================== vor der Geburt
  {
    key: 'schwangerschaft-melden',
    phase: 'vor',
    section: 'Arbeit',
    label: 'Schwangerschaft dem Arbeitgeber melden',
    deadline: 'Sobald du es weißt und dich bereit fühlst – die Schutzbestimmungen greifen erst ab der Meldung.',
    authority: 'Arbeitgeber',
    needs: ['Voraussichtlicher Geburtstermin'],
    note: 'Eine ärztliche Bestätigung musst du nur vorlegen, wenn der Arbeitgeber ausdrücklich danach fragt. Ab der Meldung gelten Kündigungsschutz und die Beschäftigungsverbote des Mutterschutzgesetzes.',
  },
  {
    key: 'ekp-untersuchungen',
    phase: 'vor',
    section: 'Gesundheit',
    label: 'Eltern-Kind-Pass-Untersuchungen wahrnehmen',
    deadline: 'Fünf Untersuchungen vor der Geburt, verteilt über die ganze Schwangerschaft.',
    authority: 'Vertragsärztin, Vertragsarzt oder Ambulanz',
    note: 'Früher Mutter-Kind-Pass. Enthalten sind unter anderem zwei Laboruntersuchungen, drei Ultraschalle und eine internistische Untersuchung. Kostenlos nur bei Vertragspartnern der Krankenkassen. Die Untersuchungen sind auch für den vollen Bezug des Kinderbetreuungsgeldes maßgeblich – Details bei der ÖGK.',
  },
  {
    key: 'mutterschutz',
    phase: 'vor',
    section: 'Arbeit',
    label: 'Mutterschutz beginnt',
    deadline: 'Acht Wochen vor dem errechneten Termin – absolutes Beschäftigungsverbot.',
    authority: 'Ergibt sich aus dem Gesetz',
    note: 'Nach der Geburt geht der Schutz mindestens acht Wochen weiter; bei Frühgeburt, Mehrlingen oder Kaiserschnitt mindestens zwölf Wochen.',
  },
  {
    key: 'wochengeld',
    phase: 'vor',
    section: 'Geld',
    label: 'Wochengeld beantragen',
    deadline: 'Kurz vor Beginn der Schutzfrist, also rund acht Wochen vor dem Termin.',
    authority: 'ÖGK bzw. deine Krankenversicherung',
    needs: ['Bestätigung über den voraussichtlichen Geburtstermin', 'Arbeitsbestätigung des Dienstgebers'],
  },
  {
    key: 'papamonat-vorankuendigung',
    phase: 'vor',
    section: 'Arbeit',
    label: 'Papamonat beim Arbeitgeber vorankündigen',
    deadline: 'Spätestens drei Monate vor dem errechneten Termin.',
    authority: 'Arbeitgeber',
    note: 'Diese Frist wird am häufigsten übersehen. Ohne rechtzeitige Vorankündigung gibt es keinen Rechtsanspruch auf die Freistellung. Den voraussichtlichen Beginn gleich mit angeben.',
  },
  {
    key: 'kbg-variante',
    phase: 'vor',
    section: 'Geld',
    label: 'Kinderbetreuungsgeld-Variante gemeinsam festlegen',
    deadline: 'In Ruhe vor der Geburt entscheiden.',
    authority: 'ÖGK, Beratung auch bei der Arbeiterkammer',
    note: 'Zur Wahl stehen das pauschale Konto und das einkommensabhängige Kinderbetreuungsgeld. Die Entscheidung wirkt sich auf beide Elternteile aus und lässt sich später nur eingeschränkt ändern.',
  },
  {
    key: 'vaterschaftsanerkennung',
    phase: 'vor',
    section: 'Papiere',
    label: 'Vaterschaft anerkennen (wenn nicht verheiratet)',
    deadline: 'Schon vor der Geburt möglich – das spart später einen Weg.',
    authority: 'Standesamt',
    needs: ['Lichtbildausweise beider Elternteile', 'Geburtsurkunden beider Elternteile'],
    note: 'Ohne Anerkennung ist der Vater rechtlich nicht Vater – das betrifft Obsorge, Namensrecht und Erbrecht.',
  },
  {
    key: 'klinik-anmeldung',
    phase: 'vor',
    section: 'Gesundheit',
    label: 'In der Geburtsklinik anmelden',
    deadline: 'Meist zwischen SSW 30 und 36.',
    authority: 'Geburtsklinik',
    needs: ['e-card', 'Eltern-Kind-Pass'],
  },

  // ========================================================== nach der Geburt
  {
    key: 'geburtsanzeige',
    phase: 'nach',
    section: 'Papiere',
    label: 'Geburt anzeigen und Vornamen bekanntgeben',
    deadline: 'Spätestens einen Monat nach der Geburt.',
    authority: 'Standesamt – die Anzeige selbst übernimmt bei einer Klinikgeburt in der Regel das Krankenhaus',
    needs: ['Lichtbildausweise', 'Geburtsurkunden der Eltern', 'Heiratsurkunde oder Vaterschaftsanerkennung', 'Meldezettel'],
    note: 'Ohne festgelegten Vornamen keine Geburtsurkunde – und ohne Geburtsurkunde läuft der Rest nicht an.',
  },
  {
    key: 'urkunden',
    phase: 'nach',
    section: 'Papiere',
    label: 'Geburtsurkunde, Staatsbürgerschaftsnachweis und Meldebestätigung holen',
    deadline: 'Sobald die Geburt beurkundet ist.',
    authority: 'Standesamt oder online über den Digitalen Babypoint',
    note: 'Die Erstausstellung dieser Dokumente ist gebührenfrei. Mehrere Ausfertigungen der Geburtsurkunde gleich mitnehmen – du brauchst sie öfter, als du denkst.',
  },
  {
    key: 'meldezettel',
    phase: 'nach',
    section: 'Papiere',
    label: 'Baby am Wohnsitz anmelden',
    deadline: 'Gleich beim Standesamt erledigen – sonst innerhalb von drei Tagen nach der Heimkehr aus der Klinik.',
    authority: 'Standesamt oder Meldebehörde (Gemeindeamt, Magistrat)',
    needs: ['Ausgefülltes Meldezettel-Formular', 'Unterschrift des Unterkunftgebers'],
    note: 'Wird die Anmeldung schon beim Standesamt gemacht, entfällt der Weg zur Meldebehörde.',
  },
  {
    key: 'mitversicherung',
    phase: 'nach',
    section: 'Gesundheit',
    label: 'Kind bei der Krankenkasse mitversichern',
    deadline: 'So bald wie möglich nach der Beurkundung.',
    authority: 'ÖGK bzw. deine Krankenversicherung',
    needs: ['Geburtsurkunde', 'Versicherungsnummer der Eltern'],
    note: 'Danach kommt die e-card des Kindes automatisch per Post. Für die erste Kinderuntersuchung reicht die Meldung.',
  },
  {
    key: 'familienbeihilfe',
    phase: 'nach',
    section: 'Geld',
    label: 'Familienbeihilfe – kommt von selbst',
    deadline: 'Kein Antrag nötig bei einer Geburt in Österreich.',
    authority: 'Finanzamt',
    automatic: true,
    note: 'Das Standesamt meldet die Geburt ins Zentrale Personenstandsregister, die Finanzverwaltung prüft automatisch und überweist. Wenn nach einigen Wochen nichts kommt: beim Finanzamt nachfragen, dann war eine Voraussetzung nicht prüfbar.',
  },
  {
    key: 'kinderbetreuungsgeld',
    phase: 'nach',
    section: 'Geld',
    label: 'Kinderbetreuungsgeld beantragen',
    deadline: 'Frühestens am Tag der Geburt, rückwirkend höchstens 182 Tage – also am besten sofort.',
    authority: 'ÖGK',
    needs: ['Geburtsurkunde', 'Wahl der Variante', 'Bankverbindung'],
    note: 'Während des Wochengeldbezugs ruht das Kinderbetreuungsgeld; ausgezahlt wird es nach dem Ende der Schutzfrist. Wer zu spät beantragt, verliert Bezugstage endgültig.',
  },
  {
    key: 'familienzeitbonus',
    phase: 'nach',
    section: 'Geld',
    label: 'Familienzeitbonus beantragen (Papamonat-Geld)',
    deadline: 'Der gesamte Bezugszeitraum muss in die ersten 91 Tage nach der Geburt fallen.',
    authority: 'ÖGK',
    note: 'Wählbar sind 28, 29, 30 oder 31 zusammenhängende Tage. 2026 sind das 54,87 Euro pro Tag. Der Bonus wird später auf ein eigenes Kinderbetreuungsgeld angerechnet.',
  },
  {
    key: 'karenz-mutter',
    phase: 'nach',
    section: 'Arbeit',
    label: 'Karenz melden – Mutter',
    deadline: 'Spätestens am letzten Tag der Schutzfrist, also meist acht Wochen nach der Geburt.',
    authority: 'Arbeitgeber',
    note: 'Beginn und Dauer angeben. Die Meldung ist Voraussetzung für den Kündigungsschutz während der Karenz.',
  },
  {
    key: 'karenz-vater',
    phase: 'nach',
    section: 'Arbeit',
    label: 'Karenz melden – Vater',
    deadline: 'Als erster Elternteil in Karenz: spätestens acht Wochen nach der Geburt. Bei späterem Antritt: spätestens drei Monate vor Beginn.',
    authority: 'Arbeitgeber',
    note: 'Bei späterem Antritt kann die Meldung frühestens vier Monate vor Beginn erfolgen – erst ab der Meldung besteht Kündigungs- und Entlassungsschutz.',
  },
  {
    key: 'kinderuntersuchungen',
    phase: 'nach',
    section: 'Gesundheit',
    label: 'Kinderuntersuchungen im Eltern-Kind-Pass',
    deadline: 'Zehn Untersuchungen bis zum fünften Geburtstag, die ersten in engen Abständen.',
    authority: 'Kinderärztin, Kinderarzt',
    note: 'Enthalten sind unter anderem eine orthopädische, eine HNO- und zwei Augenuntersuchungen. Die Termine stehen in der App unter Schwangerschaft → Termine.',
  },
  {
    key: 'reisepass',
    phase: 'nach',
    section: 'Papiere',
    label: 'Reisepass für das Kind – nur wenn ihr reist',
    deadline: 'Rechtzeitig vor der ersten Reise; Babys brauchen ein eigenes Dokument.',
    authority: 'Passbehörde (Gemeinde, Magistrat, Bezirkshauptmannschaft)',
    needs: ['Geburtsurkunde', 'Staatsbürgerschaftsnachweis', 'Passfoto', 'Zustimmung beider Obsorgeberechtigten'],
  },
]

/** Quellenhinweis fuer die Seite – gehoert sichtbar dazu, nicht ins Impressum. */
export const ADMIN_SOURCES = [
  'oesterreich.gv.at – Behördenwege bei der Geburt eines Kindes',
  'Arbeiterkammer – Mutterschutz, Karenz, Papamonat und Familienzeitbonus',
  'ÖGK – Wochengeld und Kinderbetreuungsgeld',
  'Gesundheitsportal des Bundes – Eltern-Kind-Pass',
]

export function adminTasksFor(phase: AdminPhase): AdminTask[] {
  return ADMIN_TASKS.filter((task) => task.phase === phase)
}

/** Abschnitte in der Reihenfolge, in der sie auf der Seite erscheinen. */
export function adminSections(phase: AdminPhase): string[] {
  const seen: string[] = []
  for (const task of adminTasksFor(phase)) {
    if (!seen.includes(task.section)) seen.push(task.section)
  }
  return seen
}
