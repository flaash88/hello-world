import type { Kopf } from '@/lib/print/kopf'

export type ZeileView = {
  dayKey: string
  tagText: string
  wochentag: string
  lebenstag: string
  anlegen: string
  stillDauer: string
  flasche: string
  flascheMl: string
  windelnNass: string
  windelnVoll: string
  schlaf: string
  gewicht: string
  /** Hat der Tag überhaupt Einträge? Sonst lohnt das Aufklappen nicht. */
  hatEintraege: boolean
}

export type ProtokollDaten = {
  childId: string
  tage: number
  kopf: Kopf
  zeilen: ZeileView[]
  schnitt: {
    anlegen: string
    stillDauer: string
    flasche: string
    flascheMl: string
    windelnNass: string
    windelnVoll: string
    schlaf: string
  }
}

export type TagesEreignis = {
  id: string
  zeit: string
  art: string
  detail: string
  wer: { initials: string; color: string; displayName: string } | null
}
