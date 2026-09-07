import type { UploadedPhoto } from '@/components/journal/photo-upload'
import type { ZahnStatus } from '@/lib/teeth/overview'
import type { Kiefer, Seite } from '@/lib/teeth/schema'

export type ZahnView = {
  key: string
  name: string
  kiefer: Kiefer
  seite: Seite
  status: ZahnStatus
  durchbruchText: string
  ausfallText: string
  eruptedOn: string | null
  eruptedOnText: string | null
  lostOn: string | null
  lostOnText: string | null
  lebensmonat: number | null
  note: string | null
  photo: UploadedPhoto | null
}

export type ZahnEckdaten = {
  key: string
  name: string
  datum: string
  lebensmonat: number | null
}
