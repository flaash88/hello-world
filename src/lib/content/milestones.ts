/**
 * Kuratierte Meilensteine.
 *
 * Die Altersfenster sind bewusst breit gehalten und als Spanne formuliert:
 * Der Zeitpunkt sagt bei gesunden Kindern wenig aus, die Reihenfolge dagegen
 * viel. Wo ein Meilenstein auch ein Warnsignal sein kann, wenn er ausbleibt,
 * steht das ausdrücklich dabei.
 */

export const MILESTONE_CATEGORIES = [
  'motorik',
  'sprache',
  'sozial',
  'ernaehrung',
  'schlaf',
  'erstes',
] as const
export type MilestoneCategory = (typeof MILESTONE_CATEGORIES)[number]

export const MILESTONE_CATEGORY_LABEL: Record<MilestoneCategory, string> = {
  motorik: 'Bewegung',
  sprache: 'Sprache',
  sozial: 'Miteinander',
  ernaehrung: 'Essen',
  schlaf: 'Schlaf',
  erstes: 'Erste Male',
}

export type MilestoneTemplate = {
  key: string
  title: string
  category: MilestoneCategory
  /** Übliches Zeitfenster in Lebenswochen. */
  fromWeeks: number
  toWeeks: number
  description: string
  /** Wenn gesetzt: ab dieser Woche lohnt eine ärztliche Abklärung. */
  concernAfterWeeks?: number
}

export const MILESTONES: MilestoneTemplate[] = [
  // ------------------------------------------------------------- Erste Male
  { key: 'erstes-laecheln', title: 'Erstes bewusstes Lächeln', category: 'erstes', fromWeeks: 4, toWeeks: 10, description: 'Ein Lächeln als Antwort auf euer Gesicht – nicht im Schlaf.', concernAfterWeeks: 13 },
  { key: 'erstes-lachen', title: 'Erstes lautes Lachen', category: 'erstes', fromWeeks: 8, toWeeks: 20, description: 'Das erste echte Lachen aus dem Bauch heraus.' },
  { key: 'erster-zahn', title: 'Erster Zahn', category: 'erstes', fromWeeks: 16, toWeeks: 52, description: 'Meist einer der unteren Schneidezähne. Die Spanne ist groß.' },
  { key: 'erstes-wort', title: 'Erstes Wort', category: 'erstes', fromWeeks: 40, toWeeks: 70, description: 'Ein Laut, der immer dasselbe bedeutet – auch wenn er nicht perfekt klingt.', concernAfterWeeks: 78 },
  { key: 'erste-schritte', title: 'Erste freie Schritte', category: 'erstes', fromWeeks: 40, toWeeks: 78, description: 'Mehrere Schritte ohne Festhalten.', concernAfterWeeks: 78 },
  { key: 'erstes-bad', title: 'Erstes Bad in der Wanne', category: 'erstes', fromWeeks: 0, toWeeks: 8, description: 'Meist nachdem der Nabel abgeheilt ist.' },
  { key: 'erster-ausflug', title: 'Erster Ausflug', category: 'erstes', fromWeeks: 0, toWeeks: 8, description: 'Der erste Weg nach draußen, der über den Spaziergang hinausgeht.' },
  { key: 'erste-nacht-durch', title: 'Erste durchgeschlafene Nacht', category: 'erstes', fromWeeks: 12, toWeeks: 156, description: 'Fünf bis sechs Stunden am Stück gelten als durchgeschlafen.' },
  { key: 'erstes-eigenes-essen', title: 'Erstes selbst gegessenes Stück', category: 'erstes', fromWeeks: 24, toWeeks: 52, description: 'Selbst gegriffen, selbst zum Mund geführt, selbst gegessen.' },
  { key: 'erster-geburtstag', title: 'Erster Geburtstag', category: 'erstes', fromWeeks: 52, toWeeks: 52, description: 'Ein Jahr geschafft.' },
  { key: 'erster-haarschnitt', title: 'Erster Haarschnitt', category: 'erstes', fromWeeks: 40, toWeeks: 156, description: 'Manche brauchen ihn früh, andere nie im ersten Jahr.' },
  { key: 'erstes-schuhwerk', title: 'Erste eigene Schuhe', category: 'erstes', fromWeeks: 45, toWeeks: 90, description: 'Nötig erst, wenn draußen gelaufen wird.' },

  // --------------------------------------------------------------- Motorik
  { key: 'kopf-heben', title: 'Kopf in Bauchlage heben', category: 'motorik', fromWeeks: 2, toWeeks: 12, description: 'Der Kopf wird kurz angehoben und gehalten.', concernAfterWeeks: 16 },
  { key: 'kopf-stabil', title: 'Kopf sicher halten', category: 'motorik', fromWeeks: 8, toWeeks: 20, description: 'Der Kopf bleibt beim Hochnehmen in aufrechter Haltung stabil.', concernAfterWeeks: 26 },
  { key: 'haende-mitte', title: 'Hände in der Körpermitte', category: 'motorik', fromWeeks: 8, toWeeks: 20, description: 'Beide Hände treffen sich vor der Brust – beide Körperhälften arbeiten zusammen.' },
  { key: 'gezielt-greifen', title: 'Gezielt greifen', category: 'motorik', fromWeeks: 12, toWeeks: 24, description: 'Nach einem Gegenstand strecken und ihn treffen.', concernAfterWeeks: 30 },
  { key: 'drehen-bauch', title: 'Vom Rücken auf den Bauch drehen', category: 'motorik', fromWeeks: 16, toWeeks: 32, description: 'Die vollständige Drehung aus eigener Kraft.', concernAfterWeeks: 39 },
  { key: 'drehen-ruecken', title: 'Vom Bauch auf den Rücken drehen', category: 'motorik', fromWeeks: 14, toWeeks: 30, description: 'Meist die erste der beiden Drehrichtungen.' },
  { key: 'hand-uebergabe', title: 'Von Hand zu Hand geben', category: 'motorik', fromWeeks: 18, toWeeks: 34, description: 'Ein Gegenstand wandert bewusst von einer Hand in die andere.' },
  { key: 'frei-sitzen', title: 'Frei sitzen', category: 'motorik', fromWeeks: 22, toWeeks: 39, description: 'Ohne Abstützen und ohne umzukippen.', concernAfterWeeks: 44 },
  { key: 'robben', title: 'Erste eigene Fortbewegung', category: 'motorik', fromWeeks: 24, toWeeks: 45, description: 'Robben, Rollen, Schieben – jedes Kind findet seinen Weg.' },
  { key: 'krabbeln', title: 'Krabbeln', category: 'motorik', fromWeeks: 28, toWeeks: 52, description: 'Im Vierfüßlergang. Manche Kinder lassen das Krabbeln ganz aus.' },
  { key: 'pinzettengriff', title: 'Pinzettengriff', category: 'motorik', fromWeeks: 32, toWeeks: 52, description: 'Kleine Dinge mit Daumen und Zeigefinger aufheben.' },
  { key: 'hochziehen', title: 'An Möbeln hochziehen', category: 'motorik', fromWeeks: 30, toWeeks: 52, description: 'Selbstständig in den Stand kommen.' },
  { key: 'seitwaerts-gehen', title: 'An Möbeln entlanggehen', category: 'motorik', fromWeeks: 34, toWeeks: 56, description: 'Seitliches Gehen mit Festhalten.' },
  { key: 'frei-stehen', title: 'Frei stehen', category: 'motorik', fromWeeks: 38, toWeeks: 65, description: 'Einige Sekunden ohne Halt.' },
  { key: 'sicher-laufen', title: 'Sicher laufen', category: 'motorik', fromWeeks: 52, toWeeks: 90, description: 'Längere Strecken ohne Sturz.' },
  { key: 'treppe-hinauf', title: 'Treppe hinaufsteigen', category: 'motorik', fromWeeks: 60, toWeeks: 110, description: 'Mit Festhalten, Stufe für Stufe.' },
  { key: 'rennen', title: 'Rennen', category: 'motorik', fromWeeks: 70, toWeeks: 120, description: 'Schnelles Laufen mit Richtungswechsel.' },
  { key: 'ball-treten', title: 'Ball treten', category: 'motorik', fromWeeks: 70, toWeeks: 130, description: 'Ohne dabei umzufallen.' },
  { key: 'huepfen', title: 'Mit beiden Füßen hüpfen', category: 'motorik', fromWeeks: 95, toWeeks: 145, description: 'Beide Füße verlassen gleichzeitig den Boden.' },
  { key: 'turm-bauen', title: 'Turm aus vier Bausteinen', category: 'motorik', fromWeeks: 60, toWeeks: 110, description: 'Stapeln erfordert genaues Loslassen.' },
  { key: 'kritzeln', title: 'Erstes Kritzeln', category: 'motorik', fromWeeks: 56, toWeeks: 110, description: 'Absichtliche Striche auf Papier.' },
  { key: 'einbein-stand', title: 'Auf einem Bein stehen', category: 'motorik', fromWeeks: 110, toWeeks: 156, description: 'Einige Sekunden ohne Halt.' },
  { key: 'dreirad', title: 'Dreirad oder Laufrad fahren', category: 'motorik', fromWeeks: 100, toWeeks: 156, description: 'Selbstständige Fortbewegung auf Rädern.' },

  // --------------------------------------------------------------- Sprache
  { key: 'gurren', title: 'Erste Gurrlaute', category: 'sprache', fromWeeks: 4, toWeeks: 14, description: 'Vokalähnliche Laute jenseits des Weinens.' },
  { key: 'wechselgespraech', title: 'Wechselgespräch mit Lauten', category: 'sprache', fromWeeks: 8, toWeeks: 22, description: 'Euer Kind antwortet auf Ansprache mit eigenen Lauten und wartet.' },
  { key: 'silben', title: 'Silbenketten', category: 'sprache', fromWeeks: 20, toWeeks: 39, description: 'Wiederholte Silben wie "bababa" oder "dadada".', concernAfterWeeks: 44 },
  { key: 'name-reagieren', title: 'Auf den Namen reagieren', category: 'sprache', fromWeeks: 20, toWeeks: 39, description: 'Aufsehen oder Innehalten beim eigenen Namen.', concernAfterWeeks: 48 },
  { key: 'zeigen', title: 'Mit dem Finger zeigen', category: 'sprache', fromWeeks: 32, toWeeks: 56, description: 'Zeigen, damit ihr dasselbe seht – eine zentrale Vorstufe zur Sprache.', concernAfterWeeks: 65 },
  { key: 'winken', title: 'Winken', category: 'sprache', fromWeeks: 32, toWeeks: 60, description: 'Eine erste soziale Geste.' },
  { key: 'mama-papa', title: 'Mama oder Papa gezielt', category: 'sprache', fromWeeks: 40, toWeeks: 70, description: 'Nicht mehr für alles, sondern für die richtige Person.' },
  { key: 'zehn-woerter', title: 'Zehn Wörter', category: 'sprache', fromWeeks: 52, toWeeks: 90, description: 'Zehn Wörter mit stabiler Bedeutung.' },
  { key: 'zweiwortsatz', title: 'Erster Zweiwortsatz', category: 'sprache', fromWeeks: 70, toWeeks: 110, description: '"Mama da", "mehr Saft" – zwei Wörter mit gemeinsamer Bedeutung.', concernAfterWeeks: 110 },
  { key: 'fuenfzig-woerter', title: 'Fünfzig Wörter', category: 'sprache', fromWeeks: 78, toWeeks: 110, description: 'Ab hier folgt bei vielen die Wortschatzexplosion.', concernAfterWeeks: 110 },
  { key: 'ich-sagen', title: 'Sich selbst "ich" nennen', category: 'sprache', fromWeeks: 110, toWeeks: 156, description: 'Ein großer Schritt im Selbstbild.' },
  { key: 'satz-drei', title: 'Sätze mit drei Wörtern', category: 'sprache', fromWeeks: 100, toWeeks: 145, description: 'Zusammenhängende Sätze mit einfacher Grammatik.' },
  { key: 'fremde-verstehen', title: 'Für Fremde verständlich', category: 'sprache', fromWeeks: 130, toWeeks: 165, description: 'Etwa drei Viertel des Gesagten sind auch für Fremde verständlich.' },

  // ---------------------------------------------------------------- Sozial
  { key: 'blickkontakt', title: 'Blickkontakt halten', category: 'sozial', fromWeeks: 1, toWeeks: 10, description: 'Längerer, gehaltener Blick in euer Gesicht.', concernAfterWeeks: 13 },
  { key: 'fremdeln', title: 'Fremdeln beginnt', category: 'sozial', fromWeeks: 20, toWeeks: 45, description: 'Ein Entwicklungsfortschritt: Bekannt und fremd werden unterschieden.' },
  { key: 'kuckuck-freude', title: 'Freude an Kuckuck-Spielen', category: 'sozial', fromWeeks: 20, toWeeks: 52, description: 'Die Erwartung des Bekannten wird zum Vergnügen.' },
  { key: 'rueckversicherung', title: 'Blick zur Rückversicherung', category: 'sozial', fromWeeks: 30, toWeeks: 56, description: 'Vor etwas Neuem wird euer Gesicht geprüft.', concernAfterWeeks: 65 },
  { key: 'nachahmen', title: 'Alltagshandlungen nachahmen', category: 'sozial', fromWeeks: 34, toWeeks: 70, description: 'Telefonieren, Wischen, Bürsten – nachgespielt.' },
  { key: 'trost-geben', title: 'Andere trösten', category: 'sozial', fromWeeks: 70, toWeeks: 130, description: 'Erste Anzeichen von Mitgefühl.' },
  { key: 'parallelspiel', title: 'Nebeneinander spielen', category: 'sozial', fromWeeks: 78, toWeeks: 130, description: 'Neben anderen Kindern, noch nicht mit ihnen.' },
  { key: 'gemeinsam-spielen', title: 'Miteinander spielen', category: 'sozial', fromWeeks: 120, toWeeks: 165, description: 'Gemeinsames Spiel mit Absprachen und Rollen.' },
  { key: 'spiegel-erkennen', title: 'Sich im Spiegel erkennen', category: 'sozial', fromWeeks: 70, toWeeks: 110, description: 'Das Gegenüber wird als man selbst erkannt.' },

  // ------------------------------------------------------------ Ernährung
  { key: 'beikost-start', title: 'Erster Brei', category: 'ernaehrung', fromWeeks: 17, toWeeks: 30, description: 'Der Beginn der Beikost, wenn die Reifezeichen da sind.' },
  { key: 'fingerfood', title: 'Erstes Fingerfood', category: 'ernaehrung', fromWeeks: 24, toWeeks: 45, description: 'Selbst gegriffen und gegessen.' },
  { key: 'becher-trinken', title: 'Aus dem Becher trinken', category: 'ernaehrung', fromWeeks: 26, toWeeks: 70, description: 'Aus einem offenen Becher, mit Unterstützung.' },
  { key: 'loeffel-selbst', title: 'Mit dem Löffel essen', category: 'ernaehrung', fromWeeks: 52, toWeeks: 110, description: 'Selbstständig, wenn auch nicht sauber.' },
  { key: 'familienkost', title: 'Isst mit am Familientisch', category: 'ernaehrung', fromWeeks: 45, toWeeks: 90, description: 'Dasselbe Essen wie alle, nur ohne Salz und klein geschnitten.' },
  { key: 'abgestillt', title: 'Abgestillt', category: 'ernaehrung', fromWeeks: 26, toWeeks: 156, description: 'Wann das passiert, entscheidet ihr – es gibt keinen richtigen Zeitpunkt.' },

  // ---------------------------------------------------------------- Schlaf
  { key: 'tag-nacht', title: 'Tag-Nacht-Rhythmus', category: 'schlaf', fromWeeks: 6, toWeeks: 20, description: 'Nachts längere Blöcke als tagsüber.' },
  { key: 'vier-stunden-block', title: 'Vier Stunden am Stück', category: 'schlaf', fromWeeks: 6, toWeeks: 30, description: 'Der erste wirklich lange Block.' },
  { key: 'zwei-nickerchen', title: 'Nur noch zwei Nickerchen', category: 'schlaf', fromWeeks: 26, toWeeks: 45, description: 'Der Übergang von drei auf zwei.' },
  { key: 'ein-nickerchen', title: 'Nur noch ein Nickerchen', category: 'schlaf', fromWeeks: 52, toWeeks: 90, description: 'Meist das Mittagsschläfchen.' },
  { key: 'eigenes-bett', title: 'Umzug ins eigene Bett', category: 'schlaf', fromWeeks: 26, toWeeks: 156, description: 'Der Wechsel aus dem Elternschlafzimmer oder ins Kinderbett.' },
  { key: 'ohne-mittagsschlaf', title: 'Ohne Mittagsschlaf', category: 'schlaf', fromWeeks: 110, toWeeks: 200, description: 'Der Mittagsschlaf fällt weg, die Bettzeit rückt nach vorn.' },
]

/** Meilensteine, deren Fenster gerade offen ist oder bald beginnt. */
export function milestonesForAge(weeks: number, lookaheadWeeks = 8): MilestoneTemplate[] {
  return MILESTONES.filter(
    (milestone) => weeks >= milestone.fromWeeks - lookaheadWeeks && weeks <= milestone.toWeeks,
  )
}

/**
 * Meilensteine, deren übliches Fenster deutlich überschritten ist und die
 * bei der nächsten Untersuchung angesprochen gehören.
 */
export function overdueMilestones(weeks: number, achievedKeys: string[]): MilestoneTemplate[] {
  return MILESTONES.filter(
    (milestone) =>
      milestone.concernAfterWeeks !== undefined &&
      weeks > milestone.concernAfterWeeks &&
      !achievedKeys.includes(milestone.key),
  )
}

export function milestoneByKey(key: string): MilestoneTemplate | null {
  return MILESTONES.find((milestone) => milestone.key === key) ?? null
}
