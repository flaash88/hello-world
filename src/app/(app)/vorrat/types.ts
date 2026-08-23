import type { Lagerort } from '@/lib/milk/storage'

export type PortionView = {
  id: string
  abgepumptAm: string
  abgepumptText: string
  mengeMl: number
  lagerort: string
  lagerortLabel: string
  behaelter: string | null
  notiz: string | null
  ablauf: string
  ablaufText: string
  abgelaufen: boolean
  aufgetaut: boolean
}

export type GruppeView = {
  lagerort: Lagerort
  label: string
  hinweis: string
  summeMl: number
  anzahl: number
  haltbarkeitText: string
  portionen: PortionView[]
}

export type StatistikView = {
  vorratMl: number
  vorratPortionen: number
  abgelaufenMl: number
  verbrauchtMl30Tage: number
  verworfenMl30Tage: number
  abgepumptMl30Tage: number
  schnittMl: number | null
  verwurfProzent: number | null
}

export type EinstellungenView = {
  milkFridgeHours: number
  milkFreezerHours: number
  milkDeepFreezeHours: number
  milkThawedHours: number
  milkExpiryPush: boolean
}
