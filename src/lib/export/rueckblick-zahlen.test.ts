import { describe, expect, it } from 'vitest'
import { rueckblickZahlen, type ZahlenEingabe } from './rueckblick-zahlen'

const FORMAT = {
  gewicht: (kg: number) => `${kg.toFixed(1).replace('.', ',')} kg`,
  laenge: (cm: number) => `${cm.toFixed(0)} cm`,
}

function daten(teile: Partial<ZahlenEingabe> = {}): ZahlenEingabe {
  return { eintraege: [], meilensteine: [], toene: [], messungen: [], ...teile }
}

describe('rueckblickZahlen', () => {
  it('zählt Einträge, Meilensteine, Aufnahmen und Fotos', () => {
    const zahlen = rueckblickZahlen(
      daten({
        eintraege: [{ media: [1, 2] }, { media: [] }, { media: [3] }],
        meilensteine: [1, 2],
        toene: [1],
      }),
      FORMAT,
    )
    expect(zahlen).toEqual([
      ['Tagebucheinträge', '3'],
      ['Meilensteine', '2'],
      ['Aufnahmen', '1'],
      ['Fotos', '3'],
    ])
  })

  it('nennt Zunahme und Wachstum aus erster und letzter Messung', () => {
    const zahlen = rueckblickZahlen(
      daten({
        messungen: [
          { weightKg: 3.4, lengthCm: 50 },
          { weightKg: 9.2, lengthCm: 74 },
        ],
      }),
      FORMAT,
    )
    expect(zahlen).toContainEqual(['Gewicht', '+5,8 kg'])
    expect(zahlen).toContainEqual(['Gewachsen', '+24 cm'])
  })

  it('lässt Gewicht weg, wenn nur eine Messung dasteht', () => {
    const zahlen = rueckblickZahlen(daten({ messungen: [{ weightKg: 5, lengthCm: 60 }] }), FORMAT)
    // Erste und letzte Messung sind dieselbe – eine Zunahme von 0 wäre eine
    // Behauptung, keine Beobachtung.
    expect(zahlen.map(([label]) => label)).not.toContain('Gewicht')
  })

  it('lässt Länge weg, wenn sie nicht eingetragen wurde', () => {
    const zahlen = rueckblickZahlen(
      daten({
        messungen: [
          { weightKg: 3.4, lengthCm: null },
          { weightKg: 9.2, lengthCm: null },
        ],
      }),
      FORMAT,
    )
    expect(zahlen.map(([label]) => label)).toContain('Gewicht')
    expect(zahlen.map(([label]) => label)).not.toContain('Gewachsen')
  })

  it('bleibt bei einem leeren Jahr bei den vier Nullen', () => {
    expect(rueckblickZahlen(daten(), FORMAT)).toHaveLength(4)
  })
})
