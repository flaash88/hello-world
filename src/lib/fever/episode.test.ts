import { describe, expect, it } from 'vitest'
import {
  EPISODE_FENSTER_STUNDEN,
  FIEBER_AB_C,
  HOHES_FIEBER_AB_C,
  ausschnittVon,
  episode,
  gaben,
  intervalle,
  messungen,
  restText,
  symptome,
  type HealthEvent,
} from './episode'

const T0 = new Date('2027-02-10T06:00:00.000Z')
const h = (stunden: number) => new Date(T0.getTime() + stunden * 3600_000)

let counter = 0
function temp(stunden: number, c: number, ort?: string, note?: string): HealthEvent {
  counter += 1
  return {
    id: `t${counter}`,
    startedAt: h(stunden),
    note: note ?? null,
    payload: { kind: 'temperature', temperatureC: c, measuredAt: ort },
  }
}

function med(
  stunden: number,
  mittel: string,
  opts: { doseMl?: number; repeatHours?: number } = {},
): HealthEvent {
  counter += 1
  return {
    id: `m${counter}`,
    startedAt: h(stunden),
    note: null,
    payload: { kind: 'medication', medication: mittel, ...opts },
  }
}

describe('Schwellen', () => {
  it('setzt Fieber bei 37,5 und die zweite Linie bei 38,5 an', () => {
    expect(FIEBER_AB_C).toBe(37.5)
    expect(HOHES_FIEBER_AB_C).toBe(38.5)
    expect(EPISODE_FENSTER_STUNDEN).toBe(72)
  })
})

describe('messungen / gaben / symptome', () => {
  const events: HealthEvent[] = [
    temp(2, 38.4, 'ear'),
    temp(0, 37.9, 'rectal'),
    med(1, 'Nurofen', { doseMl: 4, repeatHours: 6 }),
    { id: 's1', startedAt: h(3), note: null, payload: { kind: 'symptom', symptom: 'Husten' } },
    { id: 'x1', startedAt: h(4), note: null, payload: { kind: 'vaccination', vaccine: 'MMR' } },
  ]

  it('sortiert Messungen nach Zeit und übernimmt den Messort', () => {
    const list = messungen(events)
    expect(list.map((m) => m.temperatureC)).toEqual([37.9, 38.4])
    expect(list[0]!.ort).toBe('rectal')
    expect(list[1]!.ort).toBe('ear')
  })

  it('verwirft einen unbekannten Messort statt ihn durchzureichen', () => {
    expect(messungen([temp(0, 38, 'daumen')])[0]!.ort).toBeNull()
  })

  it('liest Mittel und Dosis, ohne etwas zu ergänzen', () => {
    const list = gaben(events)
    expect(list).toHaveLength(1)
    expect(list[0]).toMatchObject({ mittel: 'Nurofen', doseMl: 4, doseMg: null, repeatHours: 6 })
  })

  it('nimmt Symptome mit und lässt Impfungen weg', () => {
    expect(symptome(events).map((s) => s.text)).toEqual(['Husten'])
  })
})

describe('episode', () => {
  it('ist aktiv, solange die letzte fiebrige Messung keine 72 Stunden her ist', () => {
    const events = [temp(0, 38.2)]
    expect(episode(events, h(70)).aktiv).toBe(true)
    expect(episode(events, h(73)).aktiv).toBe(false)
  })

  it('bleibt still, wenn nie Fieber gemessen wurde', () => {
    const ep = episode([temp(0, 37.1), temp(2, 37.4)], h(3))
    expect(ep.aktiv).toBe(false)
    expect(ep.beginn).toBeNull()
    expect(ep.hoechste).toBeNull()
  })

  it('reicht genau 37,5 noch nicht für Fieber', () => {
    expect(episode([temp(0, 37.5)], h(1)).aktiv).toBe(false)
    expect(episode([temp(0, 37.6)], h(1)).aktiv).toBe(true)
  })

  it('nennt Beginn und höchste Temperatur mit Zeit und Ort', () => {
    const ep = episode([temp(0, 38.0, 'rectal'), temp(6, 39.4, 'ear'), temp(12, 38.1, 'ear')], h(13))
    expect(ep.beginn!.toISOString()).toBe(h(0).toISOString())
    expect(ep.hoechste!.temperatureC).toBe(39.4)
    expect(ep.hoechste!.at.toISOString()).toBe(h(6).toISOString())
    expect(ep.hoechste!.ort).toBe('ear')
  })

  it('trennt zwei Episoden, wenn mehr als 72 Stunden dazwischen liegen', () => {
    const ep = episode([temp(0, 38.5), temp(100, 38.9)], h(101))
    expect(ep.beginn!.toISOString()).toBe(h(100).toISOString())
    expect(ep.messungen).toHaveLength(1)
  })

  it('nimmt auch fieberfreie Messungen innerhalb der Episode mit', () => {
    const ep = episode([temp(0, 38.5), temp(4, 36.9), temp(8, 38.2)], h(9))
    expect(ep.messungen.map((m) => m.temperatureC)).toEqual([38.5, 36.9, 38.2])
  })

  it('sammelt Gaben und Symptome der Episode ein', () => {
    const ep = episode(
      [
        temp(0, 38.5),
        med(1, 'Nurofen', { doseMl: 4 }),
        { id: 's', startedAt: h(2), note: null, payload: { kind: 'symptom', symptom: 'schlapp' } },
      ],
      h(3),
    )
    expect(ep.gaben).toHaveLength(1)
    expect(ep.symptome).toHaveLength(1)
  })
})

describe('intervalle', () => {
  it('rechnet die früheste nächste Gabe nur aus dem eingetragenen Intervall', () => {
    const list = intervalle(gaben([med(0, 'Nurofen', { doseMl: 4, repeatHours: 6 })]), h(2))
    expect(list[0]!.fruehestensAb!.toISOString()).toBe(h(6).toISOString())
    expect(list[0]!.restMinuten).toBe(240)
  })

  it('lässt die Zeit offen, wenn kein Intervall eingetragen wurde', () => {
    const list = intervalle(gaben([med(0, 'Nurofen', { doseMl: 4 })]), h(2))
    expect(list[0]!.fruehestensAb).toBeNull()
    expect(list[0]!.fruehestensText).toBeNull()
    expect(list[0]!.restMinuten).toBe(0)
  })

  it('zählt je Mittel getrennt, wie oft es in 24 Stunden gegeben wurde', () => {
    const list = intervalle(
      gaben([
        med(0, 'Nurofen', { repeatHours: 6 }),
        med(6, 'Nurofen', { repeatHours: 6 }),
        med(30, 'Nurofen', { repeatHours: 6 }),
        med(28, 'Mexalen', { repeatHours: 4 }),
      ]),
      h(31),
    )
    const nurofen = list.find((i) => i.mittel === 'Nurofen')!
    const mexalen = list.find((i) => i.mittel === 'Mexalen')!
    // Nur die Gabe bei Stunde 30 liegt innerhalb der letzten 24 Stunden.
    expect(nurofen.imLetztenTag).toBe(1)
    expect(mexalen.imLetztenTag).toBe(1)
  })

  it('setzt die zuletzt gegebene Substanz nach oben', () => {
    const list = intervalle(gaben([med(0, 'Mexalen'), med(5, 'Nurofen')]), h(6))
    expect(list.map((i) => i.mittel)).toEqual(['Nurofen', 'Mexalen'])
  })

  it('kappt den Rest bei null, statt negativ zu werden', () => {
    const list = intervalle(gaben([med(0, 'Nurofen', { repeatHours: 6 })]), h(9))
    expect(list[0]!.restMinuten).toBe(0)
  })
})

describe('restText', () => {
  it('formuliert den Countdown', () => {
    expect(restText(0)).toBe('Intervall ist um')
    expect(restText(45)).toBe('noch 45 Min')
    expect(restText(120)).toBe('noch 2 Std')
    expect(restText(130)).toBe('noch 2 Std 10 Min')
  })
})

describe('ausschnittVon', () => {
  const ep = episode([temp(0, 38.5)], h(1))

  it('rechnet feste Zeiträume von jetzt zurück', () => {
    expect(ausschnittVon(24, ep, h(30)).toISOString()).toBe(h(6).toISOString())
  })

  it('nimmt für „ganze Episode" deren Beginn', () => {
    expect(ausschnittVon('episode', ep, h(30)).toISOString()).toBe(h(0).toISOString())
  })
})
