/**
 * Untersuchungen nach dem oesterreichischen Mutter-Kind-Pass.
 *
 * Die Zeitfenster folgen dem Schema des Mutter-Kind-Pass-Programms. Sie sind
 * als Checkliste gedacht: Was wann ungefaehr ansteht, damit nichts untergeht.
 * Verbindlich ist immer, was im Pass eingetragen ist und was die betreuende
 * Aerztin bzw. Hebamme sagt.
 */
import { startOfGestationalWeek } from './weeks'

export type MkpExam = {
  key: string
  title: string
  /** Fruehestes und spaetestes sinnvolles Schwangerschaftsalter in Wochen. */
  fromWeek: number
  toWeek: number
  description: string
  category: 'mkp'
}

export const MKP_EXAMS: MkpExam[] = [
  {
    key: 'mkp-1',
    title: '1. Untersuchung – Erstuntersuchung',
    fromWeek: 8,
    toWeek: 12,
    description:
      'Feststellung der Schwangerschaft, Blutabnahme (Blutgruppe, Rhesusfaktor, Antikörper, Röteln, Toxoplasmose, Lues, HIV auf Wunsch), Harnbefund, Blutdruck, Gewicht, erste Beratung.',
    category: 'mkp',
  },
  {
    key: 'mkp-us-1',
    title: '1. Ultraschall',
    fromWeek: 8,
    toWeek: 12,
    description:
      'Bestätigung der Schwangerschaft, Herzaktion, Bestimmung des Schwangerschaftsalters und damit des errechneten Termins.',
    category: 'mkp',
  },
  {
    key: 'screening-1',
    title: 'Erst-Trimester-Screening (freiwillig)',
    fromWeek: 11,
    toWeek: 14,
    description:
      'Nackenfaltenmessung kombiniert mit Blutwerten. Freiwillig und meist selbst zu zahlen. Liefert eine Wahrscheinlichkeit, keine Diagnose.',
    category: 'mkp',
  },
  {
    key: 'mkp-2',
    title: '2. Untersuchung',
    fromWeek: 16,
    toWeek: 20,
    description:
      'Interne Untersuchung oder gynäkologische Kontrolle, Blutdruck, Gewicht, Harnbefund, Kontrolle des Gebärmutterwachstums.',
    category: 'mkp',
  },
  {
    key: 'mkp-us-2',
    title: '2. Ultraschall – Organscreening',
    fromWeek: 18,
    toWeek: 22,
    description:
      'Ausführliche Kontrolle aller Organe, Messung von Kopf, Bauch und Oberschenkelknochen, Lage der Plazenta, Fruchtwassermenge.',
    category: 'mkp',
  },
  {
    key: 'ogtt',
    title: 'Zuckerbelastungstest (oGTT)',
    fromWeek: 24,
    toWeek: 28,
    description:
      'Nüchtern-Blutabnahme, dann Zuckerlösung trinken, nach einer und nach zwei Stunden erneut Blutabnahme. Dauert insgesamt gut zwei Stunden.',
    category: 'mkp',
  },
  {
    key: 'mkp-3',
    title: '3. Untersuchung',
    fromWeek: 25,
    toWeek: 28,
    description:
      'Gynäkologische Kontrolle, Blutbild, Blutdruck, Gewicht, Harnbefund. Bei Rhesus-negativer Mutter zusätzlich die Anti-D-Prophylaxe.',
    category: 'mkp',
  },
  {
    key: 'mkp-us-3',
    title: '3. Ultraschall',
    fromWeek: 30,
    toWeek: 34,
    description:
      'Kontrolle von Wachstum, Lage des Kindes, Fruchtwassermenge und Plazenta.',
    category: 'mkp',
  },
  {
    key: 'mkp-4',
    title: '4. Untersuchung',
    fromWeek: 30,
    toWeek: 34,
    description:
      'Gynäkologische Kontrolle, Blutdruck, Gewicht, Harnbefund, Beurteilung der Kindslage.',
    category: 'mkp',
  },
  {
    key: 'gbs',
    title: 'Abstrich auf B-Streptokokken',
    fromWeek: 35,
    toWeek: 37,
    description:
      'Einfacher Abstrich. Ein positiver Befund bedeutet nur, dass unter der Geburt ein Antibiotikum gegeben wird.',
    category: 'mkp',
  },
  {
    key: 'mkp-5',
    title: '5. Untersuchung',
    fromWeek: 35,
    toWeek: 38,
    description:
      'Letzte reguläre Untersuchung vor der Geburt: gynäkologische Kontrolle, Blutdruck, Gewicht, Harnbefund, meist CTG.',
    category: 'mkp',
  },
  {
    key: 'hebamme',
    title: 'Hebammen-Beratungsgespräch',
    fromWeek: 18,
    toWeek: 34,
    description:
      'Pflichttermin für den vollen Anspruch auf Familienzeitbonus bzw. Kinderbetreuungsgeld. Frühzeitig ausmachen – die Termine sind knapp.',
    category: 'mkp',
  },
  {
    key: 'geburtsvorbereitung',
    title: 'Geburtsvorbereitungskurs',
    fromWeek: 26,
    toWeek: 34,
    description:
      'Meist über mehrere Wochen oder als Wochenendkurs. Anmeldung deutlich früher nötig, oft schon im zweiten Trimester.',
    category: 'mkp',
  },
  {
    key: 'klinik-anmeldung',
    title: 'Anmeldung in der Geburtsklinik',
    fromWeek: 28,
    toWeek: 36,
    description:
      'Voranmeldung inklusive Aufnahmegespräch. Erspart bei der Geburt Papierkram im ungünstigsten Moment.',
    category: 'mkp',
  },
]

/** Legt aus dem ET fuer jede Untersuchung ein konkretes Zeitfenster fest. */
export function mkpScheduleFor(
  dueDate: Date,
  tz?: string,
): { exam: MkpExam; windowFrom: Date; windowTo: Date }[] {
  return MKP_EXAMS.map((exam) => ({
    exam,
    windowFrom: startOfGestationalWeek(dueDate, exam.fromWeek, tz),
    // Das Fenster endet am Ende der Zielwoche, also sieben Tage spaeter.
    windowTo: startOfGestationalWeek(dueDate, exam.toWeek + 1, tz),
  }))
}
