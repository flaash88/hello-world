import type { Metadata } from 'next'
import { Baby } from 'lucide-react'
import { getAppContext } from '@/lib/household'
import { prisma } from '@/lib/db'
import { formatDateLong } from '@/lib/time'
import { uebersicht, zustaende } from '@/lib/teeth/overview'
import { ausfallText, durchbruchText } from '@/lib/teeth/schema'
import { EmptyState } from '@/components/ui/empty-state'
import { ZaehneAnsicht } from './zaehne-ansicht'
import type { ZahnView } from './types'

export const metadata: Metadata = { title: 'Zähne' }

export default async function ZaehnePage() {
  const ctx = await getAppContext()
  const child = ctx.activeChild

  if (!child) {
    return (
      <EmptyState
        icon={Baby}
        title="Noch kein Kind angelegt"
        description="Das Zahnschema gehört zu einem Kind – leg zuerst eines an."
      />
    )
  }

  const eintraege = await prisma.tooth.findMany({ where: { childId: child.id } })
  const mediaIds = eintraege.map((e) => e.mediaId).filter((id): id is string => Boolean(id))
  const media = mediaIds.length
    ? await prisma.mediaAsset.findMany({
        where: { id: { in: mediaIds }, childId: child.id },
        select: { id: true, path: true, thumbPath: true, takenAt: true },
      })
    : []
  const mediaById = new Map(media.map((m) => [m.id, m]))

  const tz = ctx.timezone
  const liste = zustaende(eintraege, child.birthDate, new Date(), tz)
  const summe = uebersicht(liste)

  const zaehne: ZahnView[] = liste.map((zustand) => {
    const asset = zustand.mediaId ? mediaById.get(zustand.mediaId) : null
    return {
      key: zustand.zahn.key,
      name: zustand.zahn.name,
      kiefer: zustand.zahn.kiefer,
      seite: zustand.zahn.seite,
      status: zustand.status,
      durchbruchText: durchbruchText(zustand.zahn),
      ausfallText: ausfallText(zustand.zahn),
      eruptedOn: zustand.eruptedOn ? zustand.eruptedOn.toISOString() : null,
      eruptedOnText: zustand.eruptedOn ? formatDateLong(zustand.eruptedOn, tz) : null,
      lostOn: zustand.lostOn ? zustand.lostOn.toISOString() : null,
      lostOnText: zustand.lostOn ? formatDateLong(zustand.lostOn, tz) : null,
      lebensmonat: zustand.lebensmonat,
      note: zustand.note,
      photo: asset
        ? {
            id: asset.id,
            path: asset.path,
            thumbPath: asset.thumbPath ?? asset.path,
            takenAt: asset.takenAt ? asset.takenAt.toISOString() : null,
          }
        : null,
    }
  })

  const byKey = new Map(zaehne.map((z) => [z.key, z]))

  return (
    <ZaehneAnsicht
      childId={child.id}
      childName={child.name}
      hatGeburtsdatum={Boolean(child.birthDate)}
      zaehne={zaehne}
      anzahlDa={summe.anzahlDa}
      anzahlAusgefallen={summe.anzahlAusgefallen}
      erster={
        summe.erster
          ? {
              name: byKey.get(summe.erster.zahn.key)?.name ?? summe.erster.zahn.name,
              key: summe.erster.zahn.key,
              datum: formatDateLong(summe.erster.eruptedOn!, tz),
              lebensmonat: summe.erster.lebensmonat,
            }
          : null
      }
      letzter={
        summe.letzter
          ? {
              name: byKey.get(summe.letzter.zahn.key)?.name ?? summe.letzter.zahn.name,
              key: summe.letzter.zahn.key,
              datum: formatDateLong(summe.letzter.eruptedOn!, tz),
              lebensmonat: summe.letzter.lebensmonat,
            }
          : null
      }
    />
  )
}
