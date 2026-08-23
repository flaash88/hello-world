import type { Metadata } from 'next'
import { Baby } from 'lucide-react'
import { getAppContext } from '@/lib/household'
import { prisma } from '@/lib/db'
import { formatDateLong } from '@/lib/time'
import { localeTag } from '@/lib/i18n'
import { loadImpfplan, loadUntersuchungen } from '@/lib/vorsorge/load'
import {
  impfEintraege,
  kbgFristen,
  letzterTag,
  untersuchungsEintraege,
  verlauf,
  type VorsorgeEintrag,
} from '@/lib/vorsorge/status'
import { EmptyState } from '@/components/ui/empty-state'
import { VorsorgeAnsicht } from './vorsorge-ansicht'
import type { KbgView, QuellenAngabe, VerlaufView, VorsorgeView } from './types'

export const metadata: Metadata = { title: 'Vorsorge' }

export default async function VorsorgePage() {
  const ctx = await getAppContext()
  const child = ctx.activeChild

  if (!child?.birthDate) {
    return (
      <EmptyState
        icon={Baby}
        title="Noch kein Geburtsdatum hinterlegt"
        description="Impftermine und Untersuchungen rechnen ab dem Geburtstag. Trag ihn im Kindprofil ein, dann steht hier der ganze Plan."
      />
    )
  }

  const [plan, untersuchungen, entries] = await Promise.all([
    loadImpfplan(),
    loadUntersuchungen(),
    prisma.vorsorgeEntry.findMany({ where: { childId: child.id } }),
  ])

  const mediaIds = entries.map((e) => e.mediaId).filter((id): id is string => Boolean(id))
  const media = mediaIds.length
    ? await prisma.mediaAsset.findMany({
        where: { id: { in: mediaIds }, childId: child.id },
        select: { id: true, path: true, thumbPath: true, takenAt: true },
      })
    : []
  const mediaById = new Map(media.map((m) => [m.id, m]))
  const mediaByKey = new Map(
    entries
      .filter((e) => e.mediaId)
      .map((e) => [`${e.kind}:${e.templateKey}`, mediaById.get(e.mediaId!) ?? null]),
  )

  const now = new Date()
  const tz = ctx.timezone
  const impfungen = impfEintraege(plan.impfungen, child.birthDate, entries, now, tz)
  const kindUntersuchungen = untersuchungsEintraege(
    untersuchungen.kind,
    child.birthDate,
    entries,
    now,
    tz,
  )

  const toView = (eintrag: VorsorgeEintrag): VorsorgeView => {
    const asset = mediaByKey.get(`${eintrag.kind}:${eintrag.key}`) ?? null
    return {
      kind: eintrag.kind,
      key: eintrag.key,
      titel: eintrag.titel,
      untertitel: eintrag.untertitel,
      hinweis: eintrag.hinweis,
      quellText: eintrag.quellText,
      quelle: eintrag.quelle,
      status: eintrag.status,
      statusText: eintrag.statusText,
      separaterTermin: eintrag.separaterTermin,
      kbgRelevant: eintrag.kbgRelevant,
      kostenfrei: eintrag.kostenfrei,
      doneAt: eintrag.doneAt ? eintrag.doneAt.toISOString() : null,
      ort: eintrag.ort,
      note: eintrag.note,
      photo: asset
        ? {
            id: asset.id,
            path: asset.path,
            thumbPath: asset.thumbPath ?? asset.path,
            takenAt: asset.takenAt ? asset.takenAt.toISOString() : null,
          }
        : null,
    }
  }

  const impfView = impfungen.map(toView)
  const untersuchungView = kindUntersuchungen.map(toView)

  const { abschnitte, ohneFenster } = verlauf([...impfungen, ...kindUntersuchungen], child.birthDate, tz)
  const verlaufView: VerlaufView[] = abschnitte.map((abschnitt) => ({
    label: abschnitt.label,
    keys: abschnitt.eintraege.map((e) => `${e.kind}:${e.key}`),
  }))

  const kbg: KbgView[] = kbgFristen(untersuchungen.kbg.fristen, child.birthDate, now, tz).map(
    (frist) => ({
      key: frist.key,
      bezeichnung: frist.bezeichnung,
      wann: frist.wann,
      faelligAm: frist.faelligAm ? formatDateLong(frist.faelligAm, tz) : null,
      status: frist.status,
      statusText: frist.statusText,
    }),
  )

  // Geldbetraege ueber die Locale – de-AT schreibt "€ 1.300", nicht "1300 EUR".
  const kuerzungText = new Intl.NumberFormat(localeTag(), {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(untersuchungen.kbg.kuerzungEuro)

  const quellen: QuellenAngabe[] = [
    {
      titel: 'Impfungen',
      quelle: plan.quelle,
      version: plan.version,
      stand: plan.stand,
      abgerufenAm: plan.abgerufenAm,
      geprueft: plan.geprueft,
      pruefhinweis: plan.pruefhinweis ?? null,
    },
    {
      titel: 'Untersuchungen',
      quelle: untersuchungen.quelle,
      version: untersuchungen.version,
      stand: untersuchungen.stand,
      abgerufenAm: untersuchungen.abgerufenAm,
      geprueft: untersuchungen.geprueft,
      pruefhinweis: untersuchungen.pruefhinweis ?? null,
    },
  ]

  // Der letzte Tag des spaetesten Fensters – daran haengt der Zeitstrahl.
  const letztesFenster = [...impfungen, ...kindUntersuchungen]
    .map((e) => letzterTag(e.fenster, tz))
    .filter((d): d is Date => d !== null)
    .sort((a, b) => b.getTime() - a.getTime())[0]

  return (
    <VorsorgeAnsicht
      childId={child.id}
      childName={child.name}
      geburtstag={formatDateLong(child.birthDate, tz)}
      impfungen={impfView}
      untersuchungen={untersuchungView}
      mutterHinweis={untersuchungen.mutter.hinweis}
      mutterAnzahl={untersuchungen.mutter.anzahl}
      kbg={kbg}
      kbgHinweis={untersuchungen.kbg.hinweis}
      kbgKuerzung={kuerzungText}
      verlauf={verlaufView}
      ohneFenster={ohneFenster.map((e) => `${e.kind}:${e.key}`)}
      bisWann={letztesFenster ? formatDateLong(letztesFenster, tz) : null}
      quellen={quellen}
    />
  )
}
