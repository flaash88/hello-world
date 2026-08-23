import type { Metadata } from 'next'
import { Baby } from 'lucide-react'
import { getAppContext } from '@/lib/household'
import { prisma } from '@/lib/db'
import { eventsBetween } from '@/lib/events/queries'
import { addDays, formatDateShort, startOfLocalDay } from '@/lib/time'
import { localeTag } from '@/lib/i18n'
import { unitPrefsFrom } from '@/lib/units'
import { druckKopf } from '@/lib/print/kopf'
import {
  PROTOKOLL_STANDARD,
  PROTOKOLL_TAGE,
  protokoll,
  schlafText,
  zellenText,
} from '@/lib/protokoll/days'
import type { StatEvent } from '@/lib/stats/aggregate'
import { EmptyState } from '@/components/ui/empty-state'
import { ProtokollAnsicht } from './protokoll-ansicht'
import type { ProtokollDaten, ZeileView } from './types'

export const metadata: Metadata = { title: 'Stillprotokoll' }

export default async function ProtokollPage({
  searchParams,
}: {
  searchParams: Promise<{ tage?: string }>
}) {
  const ctx = await getAppContext()
  const child = ctx.activeChild
  const now = new Date()
  const tz = ctx.timezone

  if (!child) {
    return (
      <EmptyState
        icon={Baby}
        title="Noch kein Kind angelegt"
        description="Das Protokoll fasst zusammen, was für ein Kind eingetragen wurde."
      />
    )
  }

  const params = await searchParams
  const gewuenscht = Number(params.tage)
  const tage = (PROTOKOLL_TAGE as readonly number[]).includes(gewuenscht)
    ? gewuenscht
    : PROTOKOLL_STANDARD

  const bis = addDays(startOfLocalDay(now, tz), 1, tz)
  const von = addDays(bis, -tage, tz)

  const [events, messungen, letzteMessung] = await Promise.all([
    eventsBetween(child.id, addDays(von, -1, tz), bis),
    prisma.growthMeasurement.findMany({
      where: { childId: child.id, measuredAt: { gte: von, lt: bis }, weightKg: { not: null } },
      select: { measuredAt: true, weightKg: true },
    }),
    prisma.growthMeasurement.findFirst({
      where: { childId: child.id, weightKg: { not: null } },
      orderBy: { measuredAt: 'desc' },
      select: { measuredAt: true, weightKg: true },
    }),
  ])

  const stats: StatEvent[] = events.map((event) => ({
    id: event.id,
    type: event.type,
    startedAt: event.startedAt,
    endedAt: event.endedAt,
    durationSec: event.durationSec,
    payload: event.payload,
    running: event.running,
  }))

  const tabelle = protokoll(
    stats,
    messungen.map((m) => ({ measuredAt: m.measuredAt, weightKg: m.weightKg as number })),
    { tage, birthDate: child.birthDate, timezone: tz, now },
  )

  const wochentagFormat = new Intl.DateTimeFormat(localeTag(), {
    timeZone: tz,
    weekday: 'short',
  })
  const gramm = (value: number | null) =>
    value === null ? '' : `${value.toLocaleString(localeTag())} g`

  const zeilen: ZeileView[] = tabelle.zeilen.map((zeile) => ({
    dayKey: zeile.dayKey,
    tagText: formatDateShort(zeile.dayStart, tz),
    wochentag: wochentagFormat.format(zeile.dayStart),
    lebenstag: zeile.lebenstag === null ? '' : String(zeile.lebenstag),
    anlegen: zellenText(zeile.anlegen),
    stillDauer: zeile.stillDauerMin === null ? '' : `${zeile.stillDauerMin} min`,
    flasche: zellenText(zeile.flasche),
    flascheMl: zeile.flascheMl === null ? '' : String(zeile.flascheMl),
    windelnNass: zellenText(zeile.windelnNass),
    windelnVoll: zellenText(zeile.windelnVoll),
    schlaf: schlafText(zeile.schlafMin),
    gewicht: gramm(zeile.gewichtG),
    hatEintraege:
      zeile.anlegen > 0 ||
      zeile.flasche > 0 ||
      zeile.windelnNass > 0 ||
      zeile.windelnVoll > 0 ||
      zeile.schlafMin > 0 ||
      zeile.gewichtG !== null,
  }))

  const schnitt = tabelle.schnitt
  const komma = (value: number) => value.toLocaleString(localeTag(), { maximumFractionDigits: 1 })

  const daten: ProtokollDaten = {
    childId: child.id,
    tage,
    kopf: druckKopf('Stillprotokoll', {
      childName: child.name,
      birthDate: child.birthDate,
      birthWeightG: child.birthWeightG,
      currentWeightKg: letzteMessung?.weightKg ?? null,
      currentWeightAt: letzteMessung?.measuredAt ?? null,
      from: tabelle.von,
      to: addDays(tabelle.bis, -1, tz),
      timezone: tz,
      units: unitPrefsFrom(ctx.household.settings),
      now,
    }),
    zeilen,
    schnitt: {
      anlegen: komma(schnitt.anlegen),
      stillDauer: schnitt.stillDauerMin === null ? '' : `${schnitt.stillDauerMin} min`,
      flasche: komma(schnitt.flasche),
      flascheMl: schnitt.flascheMl === null ? '' : String(schnitt.flascheMl),
      windelnNass: komma(schnitt.windelnNass),
      windelnVoll: komma(schnitt.windelnVoll),
      schlaf: schlafText(schnitt.schlafMin),
    },
  }

  return <ProtokollAnsicht daten={daten} />
}
