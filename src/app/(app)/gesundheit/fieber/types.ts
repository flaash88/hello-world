import type { Messort } from '@/lib/fever/episode'

export type MessungView = {
  id: string
  at: string
  temperatureC: number
  ort: Messort | null
  note: string | null
}

export type GabeView = {
  id: string
  at: string
  mittel: string
  doseMl: number | null
  doseMg: number | null
  repeatHours: number | null
  note: string | null
}

export type IntervallView = {
  mittel: string
  letzteGabeAt: string
  letzteGabeMl: number | null
  letzteGabeMg: number | null
  fruehestensAb: string | null
  fruehestensText: string | null
  imLetztenTag: number
}

export type FieberDaten = {
  childName: string
  geburtsdatum: string | null
  alterMonate: number | null
  gewichtKg: number | null
  gewichtVom: string | null
  beginn: string
  hoechste: { temperatureC: number; at: string; ort: Messort | null } | null
  messungen: MessungView[]
  gaben: GabeView[]
  symptome: { id: string; at: string; text: string }[]
  intervalle: IntervallView[]
  /** Trinken und Windeln der letzten 24 Stunden – fuer den Arztzettel. */
  tag: {
    trinkmengeMl: number
    stillminuten: number
    windelnNass: number
    windelnStuhl: number
  }
}
