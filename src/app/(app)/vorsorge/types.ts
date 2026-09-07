import type { UploadedPhoto } from '@/components/journal/photo-upload'
import type { VorsorgeStatus } from '@/lib/vorsorge/status'

/**
 * Was die Client-Komponente von einem Vorsorgetermin braucht. Bewusst flach
 * und ohne Date-Objekte – ueber die Server-Client-Grenze gehen nur Strings.
 */
export type VorsorgeView = {
  kind: 'impfung' | 'untersuchung'
  key: string
  titel: string
  untertitel: string
  hinweis: string
  quellText: string | null
  quelle: string | null
  status: VorsorgeStatus
  statusText: string
  separaterTermin: boolean
  kbgRelevant: boolean
  kostenfrei: boolean | null
  doneAt: string | null
  ort: string | null
  note: string | null
  photo: UploadedPhoto | null
}

export type KbgView = {
  key: string
  bezeichnung: string
  wann: string
  faelligAm: string | null
  status: VorsorgeStatus
  statusText: string
}

export type VerlaufView = { label: string; keys: string[] }

export type QuellenAngabe = {
  titel: string
  quelle: string
  version: string
  stand: string
  abgerufenAm: string
  geprueft: boolean
  pruefhinweis: string | null
}
