import type { Metadata } from 'next'
import { Thermometer } from 'lucide-react'
import Link from 'next/link'
import { getAppContext } from '@/lib/household'
import { prisma } from '@/lib/db'
import { druckKopf } from '@/lib/print/kopf'
import { unitPrefsFrom } from '@/lib/units'
import {
  EPISODE_FENSTER_STUNDEN,
  FIEBER_AB_C,
  episode,
  intervalle,
  type HealthEvent,
} from '@/lib/fever/episode'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { FieberAnsicht } from './fieber-ansicht'
import type { FieberDaten } from './types'

export const metadata: Metadata = { title: 'Fieberverlauf' }

/** So weit wird geladen – eine Episode kann drei Tage dauern, plus Vorlauf. */
const LADEFENSTER_TAGE = 10

export default async function FieberPage() {
  const ctx = await getAppContext()
  const child = ctx.activeChild
  const now = new Date()
  const tz = ctx.timezone

  if (!child) {
    return (
      <EmptyState
        icon={Thermometer}
        title="Noch kein Kind angelegt"
        description="Der Fieberverlauf gehört zu einem Kind – leg zuerst eines an."
      />
    )
  }

  const seit = new Date(now.getTime() - LADEFENSTER_TAGE * 86400_000)
  const rows = await prisma.event.findMany({
    where: { childId: child.id, type: 'health', deletedAt: null, startedAt: { gte: seit } },
    orderBy: { startedAt: 'asc' },
    select: { id: true, startedAt: true, note: true, payload: true },
  })

  const events: HealthEvent[] = rows.map((row) => ({
    id: row.id,
    startedAt: row.startedAt,
    note: row.note,
    payload: (row.payload ?? {}) as HealthEvent['payload'],
  }))

  const ep = episode(events, now)

  if (!ep.aktiv) {
    return (
      <div className="flex flex-col gap-4">
        <EmptyState
          icon={Thermometer}
          title="Gerade kein Fieber"
          description={`Diese Ansicht schaltet sich frei, sobald in den letzten ${EPISODE_FENSTER_STUNDEN} Stunden eine Temperatur über ${FIEBER_AB_C.toLocaleString('de-AT')} °C eingetragen wurde.`}
        />
        <Button asChild size="lg">
          <Link href="/heute">Temperatur eintragen</Link>
        </Button>
      </div>
    )
  }

  const tagesgrenze = new Date(now.getTime() - 24 * 3600_000)
  const [letzteMessung, tagesEvents] = await Promise.all([
    prisma.growthMeasurement.findFirst({
      where: { childId: child.id, weightKg: { not: null } },
      orderBy: { measuredAt: 'desc' },
      select: { weightKg: true, measuredAt: true },
    }),
    prisma.event.findMany({
      where: {
        childId: child.id,
        deletedAt: null,
        startedAt: { gte: tagesgrenze },
        type: { in: ['bottle', 'nursing', 'diaper'] },
      },
      select: { type: true, payload: true, durationSec: true },
    }),
  ])

  let trinkmengeMl = 0
  let stillminuten = 0
  let windelnNass = 0
  let windelnStuhl = 0
  for (const row of tagesEvents) {
    const payload = (row.payload ?? {}) as {
      amountMl?: number
      leftoverMl?: number
      kind?: string
    }
    if (row.type === 'bottle') {
      trinkmengeMl += Math.max(0, (payload.amountMl ?? 0) - (payload.leftoverMl ?? 0))
    } else if (row.type === 'nursing') {
      stillminuten += Math.round((row.durationSec ?? 0) / 60)
    } else if (row.type === 'diaper') {
      if (payload.kind === 'dirty' || payload.kind === 'both') windelnStuhl += 1
      if (payload.kind === 'wet' || payload.kind === 'both') windelnNass += 1
    }
  }

  const daten: FieberDaten = {
    childName: child.name,
    kopf: druckKopf('Fieberverlauf', {
      childName: child.name,
      birthDate: child.birthDate,
      currentWeightKg: letzteMessung?.weightKg ?? null,
      currentWeightAt: letzteMessung?.measuredAt ?? null,
      from: ep.beginn,
      to: now,
      timezone: tz,
      units: unitPrefsFrom(ctx.household.settings),
      now,
    }),
    beginn: ep.beginn!.toISOString(),
    hoechste: ep.hoechste
      ? {
          temperatureC: ep.hoechste.temperatureC,
          at: ep.hoechste.at.toISOString(),
          ort: ep.hoechste.ort,
        }
      : null,
    messungen: ep.messungen.map((m) => ({
      id: m.id,
      at: m.at.toISOString(),
      temperatureC: m.temperatureC,
      ort: m.ort,
      note: m.note,
    })),
    gaben: ep.gaben.map((g) => ({
      id: g.id,
      at: g.at.toISOString(),
      mittel: g.mittel,
      doseMl: g.doseMl,
      doseMg: g.doseMg,
      repeatHours: g.repeatHours,
      note: g.note,
    })),
    symptome: ep.symptome.map((s) => ({ id: s.id, at: s.at.toISOString(), text: s.text })),
    intervalle: intervalle(ep.gaben, now, tz).map((i) => ({
      mittel: i.mittel,
      letzteGabeAt: i.letzteGabe.at.toISOString(),
      letzteGabeMl: i.letzteGabe.doseMl,
      letzteGabeMg: i.letzteGabe.doseMg,
      fruehestensAb: i.fruehestensAb ? i.fruehestensAb.toISOString() : null,
      fruehestensText: i.fruehestensText,
      imLetztenTag: i.imLetztenTag,
    })),
    tag: { trinkmengeMl, stillminuten, windelnNass, windelnStuhl },
  }

  return <FieberAnsicht daten={daten} />
}
