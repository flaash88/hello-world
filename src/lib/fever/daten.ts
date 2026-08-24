import 'server-only'
import { prisma } from '@/lib/db'
import { druckKopf } from '@/lib/print/kopf'
import type { UnitPrefs } from '@/lib/units'
import { episode, intervalle, type HealthEvent } from './episode'
import type { FieberDaten } from './views'

/**
 * Alles, was der Fieberbereich zeigt – einmal geladen, von zwei Stellen
 * benutzt: der Seite und dem PDF für die Ordination. Zwei Abfragen für
 * dieselbe Ansicht laufen sonst auseinander, sobald eine von beiden angepasst
 * wird.
 */

/** So weit wird geladen – eine Episode kann drei Tage dauern, plus Vorlauf. */
export const LADEFENSTER_TAGE = 10

export type FieberKind = { id: string; name: string; birthDate: Date | null }

export async function ladeFieberDaten(opts: {
  child: FieberKind
  timezone: string
  units: UnitPrefs
  now?: Date
}): Promise<FieberDaten | null> {
  const { child, timezone: tz, units } = opts
  const now = opts.now ?? new Date()

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
  if (!ep.aktiv || !ep.beginn) return null

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

  return {
    childId: child.id,
    childName: child.name,
    kopf: druckKopf('Fieberverlauf', {
      childName: child.name,
      birthDate: child.birthDate,
      currentWeightKg: letzteMessung?.weightKg ?? null,
      currentWeightAt: letzteMessung?.measuredAt ?? null,
      from: ep.beginn,
      to: now,
      timezone: tz,
      units,
      now,
    }),
    beginn: ep.beginn.toISOString(),
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
}
