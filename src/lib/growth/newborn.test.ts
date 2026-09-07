import { describe, expect, it } from 'vitest'
import {
  ERWARTBAR_BIS_PROZENT,
  HINWEIS_AB_PROZENT,
  NEUGEBORENEN_WOCHEN,
  VERLAUF_TAGE,
  ZURUECK_BIS_LEBENSTAG,
  grammText,
  istNeugeborenes,
  neugeborenenVerlauf,
  prozentText,
  type Messung,
} from './newborn'

// Geburt am 28. Oktober 2026 um 05:30 Wiener Zeit.
const GEBURT = new Date('2026-10-28T04:30:00.000Z')
const GEBURTSGEWICHT = 3400

/** Messung an Lebenstag `tag`, standardmäßig um 09:00 Wiener Zeit. */
function messung(tag: number, weightG: number, stunde = 8): Messung {
  const datum = new Date(GEBURT)
  datum.setUTCDate(datum.getUTCDate() + tag)
  datum.setUTCHours(stunde, 0, 0, 0)
  return { id: `m${tag}-${weightG}`, measuredAt: datum, weightG }
}

describe('Konstanten', () => {
  it('markiert bei −7 und −10 Prozent', () => {
    expect(ERWARTBAR_BIS_PROZENT).toBe(-7)
    expect(HINWEIS_AB_PROZENT).toBe(-10)
  })

  it('deckt die ersten sechs Wochen und 28 Tage Verlauf ab', () => {
    expect(NEUGEBORENEN_WOCHEN).toBe(6)
    expect(VERLAUF_TAGE).toBe(28)
    expect(ZURUECK_BIS_LEBENSTAG).toBe(14)
  })
})

describe('istNeugeborenes', () => {
  it('gilt bis Lebenstag 41 und danach nicht mehr', () => {
    const tag = (n: number) => new Date(GEBURT.getTime() + n * 86400_000)
    expect(istNeugeborenes(GEBURT, tag(0))).toBe(true)
    expect(istNeugeborenes(GEBURT, tag(41))).toBe(true)
    expect(istNeugeborenes(GEBURT, tag(42))).toBe(false)
  })

  it('bleibt ohne Geburtsdatum bei nein', () => {
    expect(istNeugeborenes(null)).toBe(false)
  })
})

describe('neugeborenenVerlauf', () => {
  const messungen = [
    messung(1, 3210),
    messung(2, 3140),
    messung(3, 3180),
    messung(5, 3290),
    messung(7, 3420),
  ]

  it('rechnet Prozent und Gramm gegen das Geburtsgewicht', () => {
    const verlauf = neugeborenenVerlauf(GEBURT, GEBURTSGEWICHT, messungen, messung(7, 0).measuredAt)
    const tag2 = verlauf.punkte.find((p) => p.lebenstag === 2)!
    expect(tag2.differenzG).toBe(-260)
    // 260 von 3400 sind 7,647 % – auf eine Nachkommastelle also 7,6.
    expect(tag2.prozent).toBe(-7.6)
  })

  it('findet den Tiefstwert samt Lebenstag', () => {
    const verlauf = neugeborenenVerlauf(GEBURT, GEBURTSGEWICHT, messungen, messung(7, 0).measuredAt)
    expect(verlauf.tiefstwert!.weightG).toBe(3140)
    expect(verlauf.tiefstwert!.lebenstag).toBe(2)
  })

  it('nennt die erste Messung, die das Geburtsgewicht wieder erreicht', () => {
    const verlauf = neugeborenenVerlauf(GEBURT, GEBURTSGEWICHT, messungen, messung(7, 0).measuredAt)
    expect(verlauf.zurueckAm!.lebenstag).toBe(7)
    expect(verlauf.zurueckAm!.weightG).toBe(3420)
  })

  it('zählt genau das Geburtsgewicht schon als wieder erreicht', () => {
    const verlauf = neugeborenenVerlauf(
      GEBURT,
      GEBURTSGEWICHT,
      [messung(1, 3200), messung(6, GEBURTSGEWICHT)],
      messung(6, 0).measuredAt,
    )
    expect(verlauf.zurueckAm!.lebenstag).toBe(6)
  })

  it('rechnet die Zunahme seit dem Tiefstwert über die letzten drei Messungen', () => {
    const verlauf = neugeborenenVerlauf(GEBURT, GEBURTSGEWICHT, messungen, messung(7, 0).measuredAt)
    // Letzte drei ab dem Tief: Tag 3 (3180) bis Tag 7 (3420) – 240 g in 4 Tagen.
    expect(verlauf.zunahmeGProTag).toBe(60)
  })

  it('erfindet keine Steigung aus einem einzigen Punkt', () => {
    const verlauf = neugeborenenVerlauf(
      GEBURT,
      GEBURTSGEWICHT,
      [messung(1, 3210)],
      messung(1, 0).measuredAt,
    )
    expect(verlauf.zunahmeGProTag).toBeNull()
  })

  it('nimmt bei zwei Messungen am selben Tag die spätere', () => {
    const verlauf = neugeborenenVerlauf(
      GEBURT,
      GEBURTSGEWICHT,
      [messung(2, 3140, 8), messung(2, 3175, 18)],
      messung(2, 0, 20).measuredAt,
    )
    expect(verlauf.punkte).toHaveLength(1)
    expect(verlauf.punkte[0]!.weightG).toBe(3175)
  })

  it('kommt ohne jede Messung klar', () => {
    const verlauf = neugeborenenVerlauf(GEBURT, GEBURTSGEWICHT, [], GEBURT)
    expect(verlauf.punkte).toEqual([])
    expect(verlauf.aktuell).toBeNull()
    expect(verlauf.tiefstwert).toBeNull()
    expect(verlauf.zurueckAm).toBeNull()
    expect(verlauf.hebammeAnsprechen).toBe(false)
  })
})

describe('Hinweis auf die Hebamme', () => {
  it('kommt bei mehr als 10 Prozent Verlust', () => {
    const verlauf = neugeborenenVerlauf(
      GEBURT,
      GEBURTSGEWICHT,
      [messung(3, 3040)], // −10,6 %
      messung(3, 0, 12).measuredAt,
    )
    expect(verlauf.hebammeAnsprechen).toBe(true)
    expect(verlauf.hebammeGrund).toBe('verlust')
  })

  it('kommt bei genau −10 Prozent', () => {
    const verlauf = neugeborenenVerlauf(
      GEBURT,
      3000,
      [messung(3, 2700)],
      messung(3, 0, 12).measuredAt,
    )
    expect(verlauf.hebammeGrund).toBe('verlust')
  })

  it('bleibt bei einem üblichen Verlust still', () => {
    const verlauf = neugeborenenVerlauf(
      GEBURT,
      GEBURTSGEWICHT,
      [messung(3, 3180)], // −6,5 %
      messung(3, 0, 12).measuredAt,
    )
    expect(verlauf.hebammeAnsprechen).toBe(false)
  })

  it('kommt, wenn das Geburtsgewicht nach Lebenstag 14 noch nicht da ist', () => {
    const verlauf = neugeborenenVerlauf(
      GEBURT,
      GEBURTSGEWICHT,
      [messung(12, 3330)],
      messung(15, 0, 12).measuredAt,
    )
    expect(verlauf.hebammeAnsprechen).toBe(true)
    expect(verlauf.hebammeGrund).toBe('dauer')
  })

  it('verstummt, sobald das Geburtsgewicht wieder erreicht ist', () => {
    const verlauf = neugeborenenVerlauf(
      GEBURT,
      GEBURTSGEWICHT,
      [messung(3, 3040), messung(10, 3450)],
      messung(20, 0, 12).measuredAt,
    )
    expect(verlauf.hebammeAnsprechen).toBe(false)
    expect(verlauf.hebammeGrund).toBeNull()
  })
})

describe('Formatierung', () => {
  it('setzt ein echtes Minuszeichen', () => {
    expect(prozentText(-7.6)).toBe('−7,6 %')
    expect(prozentText(1.2)).toBe('+1,2 %')
    expect(prozentText(0)).toBe('±0,0 %')
    expect(grammText(-260)).toBe('−260 g')
    expect(grammText(80)).toBe('+80 g')
    expect(grammText(0)).toBe('±0 g')
  })

  it('nennt keine Wertung', () => {
    expect(prozentText(-11)).not.toMatch(/zu |kritisch|Achtung/)
  })
})
