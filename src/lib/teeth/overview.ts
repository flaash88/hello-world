/**
 * Auswertung des Zahnschemas: was ist da, was wird erwartet, was ist der
 * erste und der letzte Zahn.
 *
 * Bewusst ohne jede Bewertung – die Spannen aus `schema.ts` sagen nur, wann
 * es bei vielen Kindern so weit ist, nicht wann es so weit sein muss.
 */
import { ageInMonths, APP_TIMEZONE } from '@/lib/time'
import { ZAEHNE, ZAHN_ANZAHL, type Zahn } from './schema'

export type ZahnEintrag = {
  toothKey: string
  eruptedOn: Date | null
  lostOn: Date | null
  note?: string | null
  mediaId?: string | null
}

export type ZahnStatus = 'da' | 'ausgefallen' | 'erwartet' | 'offen'

export type ZahnZustand = {
  zahn: Zahn
  status: ZahnStatus
  eruptedOn: Date | null
  lostOn: Date | null
  /** Lebensmonat beim Durchbruch – nur wenn ein Datum eingetragen ist. */
  lebensmonat: number | null
  note: string | null
  mediaId: string | null
}

export function zustaende(
  eintraege: ZahnEintrag[],
  birthDate: Date | null,
  now: Date = new Date(),
  tz: string = APP_TIMEZONE,
): ZahnZustand[] {
  const byKey = new Map(eintraege.map((e) => [e.toothKey, e]))
  const alterMonate = birthDate ? ageInMonths(birthDate, now, tz) : null

  return ZAEHNE.map((zahn) => {
    const eintrag = byKey.get(zahn.key)
    const eruptedOn = eintrag?.eruptedOn ?? null
    const lostOn = eintrag?.lostOn ?? null

    const status: ZahnStatus = lostOn
      ? 'ausgefallen'
      : eruptedOn
        ? 'da'
        : alterMonate !== null && alterMonate >= zahn.durchbruchVonMonaten
          ? 'erwartet'
          : 'offen'

    return {
      zahn,
      status,
      eruptedOn,
      lostOn,
      lebensmonat: eruptedOn && birthDate ? ageInMonths(birthDate, eruptedOn, tz) : null,
      note: eintrag?.note ?? null,
      mediaId: eintrag?.mediaId ?? null,
    }
  })
}

export type ZahnUebersicht = {
  anzahlDa: number
  anzahlGesamt: number
  anzahlAusgefallen: number
  erster: ZahnZustand | null
  letzter: ZahnZustand | null
}

export function uebersicht(zustandListe: ZahnZustand[]): ZahnUebersicht {
  const mitDatum = zustandListe
    .filter((z) => z.eruptedOn !== null)
    .sort((a, b) => a.eruptedOn!.getTime() - b.eruptedOn!.getTime())

  return {
    anzahlDa: zustandListe.filter((z) => z.status === 'da').length,
    anzahlGesamt: ZAHN_ANZAHL,
    anzahlAusgefallen: zustandListe.filter((z) => z.status === 'ausgefallen').length,
    erster: mitDatum[0] ?? null,
    // Bei nur einem eingetragenen Zahn ist der erste auch der letzte – dann
    // waere "letzter Zahn" eine Doppelmeldung.
    letzter: mitDatum.length > 1 ? (mitDatum[mitDatum.length - 1] ?? null) : null,
  }
}

/** Schluessel des Meilensteins, den der erste Zahn automatisch anlegt. */
export const ERSTER_ZAHN_MILESTONE = 'erster-zahn'
