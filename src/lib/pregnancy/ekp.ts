/**
 * Untersuchungen nach dem oesterreichischen Eltern-Kind-Pass (frueher
 * Mutter-Kind-Pass; umbenannt mit dem Eltern-Kind-Pass-Gesetz, in Kraft seit
 * 1. Jaenner 2024).
 *
 * Das Programm sieht in der Schwangerschaft fuenf aerztliche Untersuchungen
 * der Mutter vor; dazu kommen drei Ultraschalluntersuchungen und Laborbefunde,
 * die den Untersuchungen zugeordnet sind. `official` markiert genau diese
 * fuenf – sie sind es, die fuer das Kinderbetreuungsgeld nachzuweisen sind.
 * Alles Weitere hier (Screening, Zuckertest, Hebammengespraech, Kurs,
 * Klinikanmeldung) ist Zusatz und bewusst als solcher gekennzeichnet.
 *
 * Die zehn Untersuchungen des Kindes ab der Geburt stehen in
 * `content/vorsorge/ekp-untersuchungen.json`.
 *
 * Verbindlich ist immer, was im Pass eingetragen ist und was die betreuende
 * Aerztin bzw. Hebamme sagt.
 */
import { startOfGestationalWeek } from './weeks'

export type EkpExam = {
  key: string
  title: string
  /** Nummer der Untersuchung im Programm – nur bei den offiziellen fuenf. */
  nummer?: number
  /** Gehoert zu den fuenf Untersuchungen des Programms? */
  official: boolean
  /** Fruehestes und spaetestes sinnvolles Schwangerschaftsalter in Wochen. */
  fromWeek: number
  toWeek: number
  description: string
  category: 'ekp'
}

export const EKP_EXAMS: EkpExam[] = [
  {
    key: 'ekp-1',
    nummer: 1,
    official: true,
    title: '1. Untersuchung – Erstuntersuchung',
    fromWeek: 8,
    toWeek: 12,
    description:
      'Feststellung der Schwangerschaft, Blutabnahme (Blutgruppe, Rhesusfaktor, Antikörper, Röteln, Toxoplasmose, Lues, HIV auf Wunsch), Harnbefund, Blutdruck, Gewicht, erste Beratung.',
    category: 'ekp',
  },
  {
    key: 'ekp-us-1',
    official: false,
    title: '1. Ultraschall',
    fromWeek: 8,
    toWeek: 12,
    description:
      'Bestätigung der Schwangerschaft, Herzaktion, Bestimmung des Schwangerschaftsalters und damit des errechneten Termins.',
    category: 'ekp',
  },
  {
    key: 'screening-1',
    official: false,
    title: 'Erst-Trimester-Screening (freiwillig)',
    fromWeek: 11,
    toWeek: 14,
    description:
      'Nackenfaltenmessung kombiniert mit Blutwerten. Freiwillig und meist selbst zu zahlen. Liefert eine Wahrscheinlichkeit, keine Diagnose.',
    category: 'ekp',
  },
  {
    key: 'ekp-2',
    nummer: 2,
    official: true,
    title: '2. Untersuchung',
    fromWeek: 16,
    toWeek: 20,
    description:
      'Interne Untersuchung oder gynäkologische Kontrolle, Blutdruck, Gewicht, Harnbefund, Kontrolle des Gebärmutterwachstums.',
    category: 'ekp',
  },
  {
    key: 'ekp-us-2',
    official: false,
    title: '2. Ultraschall – Organscreening',
    fromWeek: 18,
    toWeek: 22,
    description:
      'Ausführliche Kontrolle aller Organe, Messung von Kopf, Bauch und Oberschenkelknochen, Lage der Plazenta, Fruchtwassermenge.',
    category: 'ekp',
  },
  {
    key: 'ogtt',
    official: false,
    title: 'Zuckerbelastungstest (oGTT)',
    fromWeek: 24,
    toWeek: 28,
    description:
      'Nüchtern-Blutabnahme, dann Zuckerlösung trinken, nach einer und nach zwei Stunden erneut Blutabnahme. Dauert insgesamt gut zwei Stunden.',
    category: 'ekp',
  },
  {
    key: 'ekp-3',
    nummer: 3,
    official: true,
    title: '3. Untersuchung',
    fromWeek: 25,
    toWeek: 28,
    description:
      'Gynäkologische Kontrolle, Blutbild, Blutdruck, Gewicht, Harnbefund. Bei Rhesus-negativer Mutter zusätzlich die Anti-D-Prophylaxe.',
    category: 'ekp',
  },
  {
    key: 'ekp-us-3',
    official: false,
    title: '3. Ultraschall',
    fromWeek: 30,
    toWeek: 34,
    description:
      'Kontrolle von Wachstum, Lage des Kindes, Fruchtwassermenge und Plazenta.',
    category: 'ekp',
  },
  {
    key: 'ekp-4',
    nummer: 4,
    official: true,
    title: '4. Untersuchung',
    fromWeek: 30,
    toWeek: 34,
    description:
      'Gynäkologische Kontrolle, Blutdruck, Gewicht, Harnbefund, Beurteilung der Kindslage.',
    category: 'ekp',
  },
  {
    key: 'gbs',
    official: false,
    title: 'Abstrich auf B-Streptokokken',
    fromWeek: 35,
    toWeek: 37,
    description:
      'Einfacher Abstrich. Ein positiver Befund bedeutet nur, dass unter der Geburt ein Antibiotikum gegeben wird.',
    category: 'ekp',
  },
  {
    key: 'ekp-5',
    nummer: 5,
    official: true,
    title: '5. Untersuchung',
    fromWeek: 35,
    toWeek: 38,
    description:
      'Letzte reguläre Untersuchung vor der Geburt: gynäkologische Kontrolle, Blutdruck, Gewicht, Harnbefund, meist CTG.',
    category: 'ekp',
  },
  {
    key: 'hebamme',
    official: false,
    title: 'Hebammen-Beratungsgespräch',
    fromWeek: 18,
    toWeek: 34,
    description:
      'Pflichttermin für den vollen Anspruch auf Familienzeitbonus bzw. Kinderbetreuungsgeld. Frühzeitig ausmachen – die Termine sind knapp.',
    category: 'ekp',
  },
  {
    key: 'geburtsvorbereitung',
    official: false,
    title: 'Geburtsvorbereitungskurs',
    fromWeek: 26,
    toWeek: 34,
    description:
      'Meist über mehrere Wochen oder als Wochenendkurs. Anmeldung deutlich früher nötig, oft schon im zweiten Trimester.',
    category: 'ekp',
  },
  {
    key: 'klinik-anmeldung',
    official: false,
    title: 'Anmeldung in der Geburtsklinik',
    fromWeek: 28,
    toWeek: 36,
    description:
      'Voranmeldung inklusive Aufnahmegespräch. Erspart bei der Geburt Papierkram im ungünstigsten Moment.',
    category: 'ekp',
  },
]

/** Legt aus dem ET fuer jede Untersuchung ein konkretes Zeitfenster fest. */
export function ekpScheduleFor(
  dueDate: Date,
  tz?: string,
): { exam: EkpExam; windowFrom: Date; windowTo: Date }[] {
  return EKP_EXAMS.map((exam) => ({
    exam,
    windowFrom: startOfGestationalWeek(dueDate, exam.fromWeek, tz),
    // Das Fenster endet am Ende der Zielwoche, also sieben Tage spaeter.
    windowTo: startOfGestationalWeek(dueDate, exam.toWeek + 1, tz),
  }))
}

/** Die fuenf Untersuchungen, die fuer das Kinderbetreuungsgeld zaehlen. */
export const OFFICIAL_EKP_EXAMS = EKP_EXAMS.filter((exam) => exam.official)
