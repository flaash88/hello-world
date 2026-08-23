import type { TonTag } from '@/lib/audio/notes'

export type TonView = {
  id: string
  title: string
  recordedAt: string
  recordedAtText: string
  durationSec: number | null
  bytes: number
  peaks: number[]
  tags: TonTag[]
  milestoneId: string | null
  milestoneTitle: string | null
  src: string
  createdBy: { initials: string; color: string; displayName: string } | null
}
