/**
 * Stillen – die ersten Wochen.
 *
 * Fachliche Grundlage: Gesundheitsportal des Bundes und „Richtig essen von
 * Anfang an“ fuer Stillen und Ernaehrung in der Stillzeit, die CDC-Leitlinie
 * fuer die Aufbewahrung abgepumpter Milch. Formuliert ist alles selbst.
 *
 * Haltung: Stillen ist erlernbar und am Anfang fast immer anstrengend. Diese
 * Seite erklaert, was normal ist, woran man ein Problem erkennt und wann man
 * Hilfe holt – und sie bewertet niemanden, der zufuettert oder abstillt.
 */

export type BfSection = {
  key: string
  title: string
  body: string
  points?: string[]
}

export const BF_BASICS: BfSection[] = [
  {
    key: 'erste-tage',
    title: 'Die ersten Tage',
    body: 'Am Anfang kommt nicht Milch, sondern Kolostrum – ein paar Milliliter dickflüssige Vormilch pro Mahlzeit. Das sieht nach nichts aus und reicht trotzdem: Der Magen eines Neugeborenen fasst am ersten Tag etwa so viel wie eine Haselnuss.',
    points: [
      'Der Milcheinschuss kommt meist zwischen Tag zwei und fünf – die Brust wird prall, warm und spannt.',
      'Häufiges Anlegen in den ersten Tagen ist das Wichtigste: Es steuert, wie viel Milch später kommt.',
      'Ein Gewichtsverlust von bis zu zehn Prozent in den ersten Tagen ist normal, das Geburtsgewicht ist nach zwei Wochen meist wieder da.',
    ],
  },
  {
    key: 'anlegen',
    title: 'Richtig anlegen',
    body: 'Fast alle Stillprobleme der ersten Wochen kommen vom Anlegen. Das Baby soll nicht die Brustwarze, sondern einen großen Teil des Warzenhofs im Mund haben – sonst tut es weh und es kommt zu wenig Milch.',
    points: [
      'Bauch an Bauch: Ohr, Schulter und Hüfte des Babys in einer Linie, der Kopf leicht überstreckt.',
      'Warten, bis der Mund weit offen ist wie beim Gähnen, dann zügig heranführen – das Kind zur Brust, nicht die Brust zum Kind.',
      'Die Unterlippe ist nach außen gestülpt, das Kinn berührt die Brust, die Nase ist frei.',
      'Es zieht, aber es schmerzt nicht. Schmerz heißt: lösen und neu ansetzen.',
      'Lösen immer mit dem kleinen Finger im Mundwinkel, nie ziehen.',
    ],
  },
  {
    key: 'positionen',
    title: 'Stillpositionen',
    body: 'Es gibt nicht die eine richtige Position – aber es hilft, mehrere zu können. Beim Wechseln werden andere Stellen der Brust entleert, das beugt Milchstau vor.',
    points: [
      'Wiegegriff: der Klassiker im Sitzen, Kissen unter den Arm.',
      'Kreuzwiegegriff: mehr Kontrolle über den Kopf – gut für die ersten Tage.',
      'Rückengriff: Baby liegt seitlich unter dem Arm. Angenehm nach einem Kaiserschnitt, weil nichts auf der Narbe liegt.',
      'Seitenlage: die Position für die Nacht.',
      'Zurückgelehnt: du halb liegend, das Baby bäuchlings auf dir. Viele Babys finden so von selbst an die Brust.',
    ],
  },
  {
    key: 'haeufigkeit',
    title: 'Wie oft ist normal',
    body: 'Acht bis zwölf Mahlzeiten in 24 Stunden sind in den ersten Wochen üblich, Tag und Nacht. Ein Rhythmus stellt sich erst nach Wochen ein.',
    points: [
      'Nach Bedarf statt nach Uhr – frühe Hungerzeichen sind Schmatzen, Suchen und Hände zum Mund. Weinen kommt zuletzt.',
      'Clusterfeeding heißt: stundenlang fast durchgehend an der Brust, meist abends. Das ist keine zu geringe Milchmenge, sondern eine Bestellung für übermorgen.',
      'Wachstumsschübe rund um Tag 10, Woche 6 und Monat 3 bringen für zwei, drei Tage deutlich mehr Hunger.',
    ],
  },
  {
    key: 'genug',
    title: 'Bekommt es genug?',
    body: 'Die Brust hat keine Skala – deshalb zählt, was hinten herauskommt, nicht wie voll sie sich anfühlt.',
    points: [
      'Ab Tag fünf: mindestens fünf bis sechs richtig nasse Windeln pro Tag.',
      'Stuhl in den ersten Wochen mehrmals täglich, senfgelb und krümelig.',
      'Das Kind ist nach dem Stillen entspannt, hat wache Phasen und nimmt zu.',
      'Nach dem Milcheinschuss darf die Brust zwischendurch weich sein – das heißt nicht leer.',
    ],
  },
  {
    key: 'ernaehrung',
    title: 'Essen und Trinken in der Stillzeit',
    body: 'Es gibt keine Verbotsliste. Blähende Lebensmittel gehen nicht in die Milch über, und Kaffee ist in normaler Menge kein Problem.',
    points: [
      'Der Bedarf an Jod und einigen anderen Nährstoffen bleibt erhöht – Supplemente also nicht sofort absetzen, sondern mit der Ärztin klären.',
      'Trinken nach Durst, aber griffbereit: ein Glas Wasser gehört an jeden Stillplatz.',
      'Alkohol geht in die Milch über. Wenn, dann direkt nach dem Stillen und mit mehreren Stunden Abstand zur nächsten Mahlzeit.',
      'Wenn dein Kind auf ein bestimmtes Lebensmittel wiederholt reagiert, lass es weg – aber streiche nichts pauschal.',
    ],
  },
]

export type BfProblem = {
  key: string
  title: string
  /** Woran man es erkennt. */
  signs: string
  /** Was sofort hilft. */
  help: string[]
  /** Wann es kein Selbsthilfe-Thema mehr ist. */
  callFor?: string
}

export const BF_PROBLEMS: BfProblem[] = [
  {
    key: 'wunde-warzen',
    title: 'Wunde Brustwarzen',
    signs: 'Schmerz während der ganzen Mahlzeit, Risse, manchmal Blut. Fast immer eine Folge falschen Anlegens.',
    help: [
      'Anlegen korrigieren lassen – das behebt die Ursache, alles andere lindert nur.',
      'Nach dem Stillen einen Tropfen Muttermilch verteilen und an der Luft trocknen lassen.',
      'Reine Lanolin-Salbe muss vor dem Stillen nicht abgewaschen werden.',
      'Mit der weniger schmerzenden Seite beginnen.',
    ],
    callFor: 'Wenn es nach zwei, drei Tagen nicht besser wird oder die Risse tief sind: Hebamme oder Stillberatung.',
  },
  {
    key: 'milchstau',
    title: 'Milchstau',
    signs: 'Eine harte, druckempfindliche Stelle, oft gerötet. Dir geht es sonst gut.',
    help: [
      'Häufig anlegen, das Kinn des Babys Richtung Verhärtung ausrichten.',
      'Vor dem Stillen Wärme, danach kühlen.',
      'Sanft von der Verhärtung Richtung Brustwarze ausstreichen – nicht kneten.',
      'Hinlegen und alles andere absagen. Ruhe ist Teil der Behandlung.',
    ],
    callFor: 'Wenn Fieber dazukommt oder es nach 24 Stunden nicht besser ist.',
  },
  {
    key: 'mastitis',
    title: 'Brustentzündung',
    signs: 'Wie ein Milchstau, aber mit Fieber über 38,5 °C, Schüttelfrost und dem Gefühl, eine Grippe zu bekommen.',
    help: [
      'Weiterstillen – die Milch ist für das Kind unbedenklich und das Entleeren ist Teil der Therapie.',
      'Bettruhe, viel trinken, kühlen.',
    ],
    callFor: 'Am selben Tag zur Ärztin. Eine Brustentzündung braucht oft mehr als Hausmittel, und je früher, desto einfacher.',
  },
  {
    key: 'zu-wenig',
    title: 'Zu wenig Milch',
    signs: 'Zu wenige nasse Windeln, kaum Gewichtszunahme, das Kind wirkt nach dem Stillen nie zufrieden.',
    help: [
      'Häufiger anlegen statt länger – die Nachfrage steuert die Menge.',
      'Beide Seiten anbieten, danach kurz abpumpen.',
      'Hautkontakt, so viel wie geht.',
      'Auf dich schauen: zu wenig Schlaf, zu wenig Essen und Dauerstress senken die Menge messbar.',
    ],
    callFor: 'Bei Gewichtsproblemen immer Kinderärztin und Stillberatung einbeziehen, nicht allein herumprobieren.',
  },
  {
    key: 'zu-viel',
    title: 'Zu viel Milch, starker Spendereflex',
    signs: 'Das Kind verschluckt sich, lässt los, schreit an der Brust; die Milch spritzt.',
    help: [
      'Zurückgelehnt stillen, damit das Kind gegen die Schwerkraft trinkt.',
      'Vor dem Anlegen den ersten Schwall in ein Tuch laufen lassen.',
      'Pro Mahlzeit nur eine Seite anbieten.',
    ],
  },
  {
    key: 'soor',
    title: 'Soor',
    signs: 'Brennende, stechende Schmerzen auch zwischen den Mahlzeiten, weißliche Beläge im Mund des Kindes.',
    help: ['Handtücher und Stilleinlagen heiß waschen, Schnuller und Sauger täglich auskochen.'],
    callFor: 'Muss behandelt werden, und zwar bei Mutter und Kind gleichzeitig – zur Ärztin.',
  },
]

/**
 * Aufbewahrung abgepumpter Milch nach CDC-Leitlinie.
 * Bewusst konservativ gerundet und mit dem Kuehlschrank-Detail, das am
 * haeufigsten schiefgeht: nicht in die Tuer stellen.
 */
export const MILK_STORAGE: { place: string; duration: string; note?: string }[] = [
  { place: 'Zimmertemperatur (bis 25 °C)', duration: 'bis zu 4 Stunden' },
  {
    place: 'Kühlschrank (4 °C)',
    duration: 'bis zu 4 Tage',
    note: 'Nach hinten stellen, nicht in die Tür – dort schwankt die Temperatur bei jedem Öffnen.',
  },
  {
    place: 'Gefrierschrank (−18 °C)',
    duration: '6 Monate sind ideal, bis zu 12 Monate vertretbar',
    note: 'Datum draufschreiben und in Portionen einfrieren, die dein Kind wirklich schafft.',
  },
  {
    place: 'Aufgetaut im Kühlschrank',
    duration: 'innerhalb von 24 Stunden verbrauchen',
    note: 'Die 24 Stunden zählen ab dem Moment, in dem die Milch vollständig aufgetaut ist.',
  },
  {
    place: 'Erwärmt',
    duration: 'innerhalb von 2 Stunden verbrauchen',
    note: 'Einmal aufgetaute Milch nie wieder einfrieren.',
  },
]

export const BF_HELP_NOTE =
  'Stillprobleme lösen sich selten durch Aushalten. In Österreich kommt die Hebamme im Wochenbett zu euch nach Hause, und Stillberatung gibt es über Krankenhäuser, Hebammen und die Still- und Laktationsberaterinnen (IBCLC). Einmal richtig anschauen lassen spart oft Wochen.'
