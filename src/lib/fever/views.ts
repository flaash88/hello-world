import type { Messort } from '@/lib/fever/episode'
import type { Kopf } from '@/lib/print/kopf'

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
  childId: string
  childName: string
  /** Kopfzeile des Arztzettels – dieselbe wie im Stillprotokoll. */
  kopf: Kopf
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
