import 'server-only'
import { prisma } from '@/lib/db'
import {
  duplikatLabel,
  fensterMinuten,
  findeDuplikat,
  hinweisText,
  istDeutlich,
  istPruefbar,
  type DuplikatKandidat,
  type Neueintrag,
} from './duplicates'

export type DuplikatHinweis = {
  id: string
  text: string
  /** Medikamentengaben werden deutlicher gesetzt als eine doppelte Windel. */
  deutlich: boolean
  meinEventId: string
  anderesEventId: string
}

/**
 * Prueft direkt nach dem Anlegen, ob die andere Person kurz davor dasselbe
 * eingetragen hat. Der Eintrag bleibt in jedem Fall stehen – hier entsteht nur
 * der Verdacht, entschieden wird in der UI.
 */
export async function pruefeDuplikat(
  neu: Neueintrag,
  childId: string,
): Promise<DuplikatHinweis | null> {
  if (!istPruefbar(neu)) return null

  const fenster = fensterMinuten(neu) * 60_000
  const rows = await prisma.event.findMany({
    where: {
      childId,
      type: neu.type,
      deletedAt: null,
      startedAt: {
        gte: new Date(neu.startedAt.getTime() - fenster),
        lte: new Date(neu.startedAt.getTime() + fenster),
      },
    },
    include: { createdBy: { select: { displayName: true } } },
  })

  const kandidaten: DuplikatKandidat[] = rows.map((row) => ({
    id: row.id,
    type: row.type,
    startedAt: row.startedAt,
    endedAt: row.endedAt,
    payload: row.payload,
    createdById: row.createdById,
    createdByName: row.createdBy.displayName,
  }))

  const treffer = findeDuplikat(neu, kandidaten)
  if (!treffer) return null

  // Der aeltere Eintrag ist der, der zuerst da war – nicht der, der zuerst
  // gespeichert wurde. Bei gleicher Startzeit entscheidet die Id, damit das
  // Paar stabil bleibt.
  const [aelter, neuer] =
    treffer.startedAt.getTime() < neu.startedAt.getTime() ||
    (treffer.startedAt.getTime() === neu.startedAt.getTime() && treffer.id < neu.id)
      ? [treffer.id, neu.id]
      : [neu.id, treffer.id]

  const vorhanden = await prisma.eventDuplicate.findUnique({
    where: { olderEventId_newerEventId: { olderEventId: aelter, newerEventId: neuer } },
    select: { id: true, status: true },
  })
  // Ein als "beide behalten" bestaetigtes Paar wird nicht erneut gemeldet.
  if (vorhanden && vorhanden.status !== 'offen') return null

  const eintrag =
    vorhanden ??
    (await prisma.eventDuplicate.create({
      data: { childId, olderEventId: aelter, newerEventId: neuer },
      select: { id: true, status: true },
    }))

  const minutenHer = Math.round(
    Math.abs(neu.startedAt.getTime() - treffer.startedAt.getTime()) / 60_000,
  )

  return {
    id: eintrag.id,
    text: hinweisText(
      treffer.createdByName ?? 'Die andere Person',
      duplikatLabel(neu),
      minutenHer,
    ),
    deutlich: istDeutlich(neu),
    meinEventId: neu.id,
    anderesEventId: treffer.id,
  }
}

/** Ereignis-Ids, die wegen eines offenen Verdachts nicht mitzaehlen sollen. */
export async function offeneDuplikatIds(childId: string): Promise<Set<string>> {
  const offen = await prisma.eventDuplicate.findMany({
    where: { childId, status: 'offen' },
    select: { newerEventId: true },
  })
  // Ausgeschlossen wird immer der neuere – der aeltere bleibt in der Statistik,
  // damit das Ereignis nicht ganz verschwindet.
  return new Set(offen.map((eintrag) => eintrag.newerEventId))
}

export async function offeneDuplikate(
  childId: string,
  zeitraum?: { von: Date; bis: Date },
): Promise<number> {
  return prisma.eventDuplicate.count({
    where: {
      childId,
      status: 'offen',
      ...(zeitraum ? { detectedAt: { gte: zeitraum.von, lt: zeitraum.bis } } : {}),
    },
  })
}

export type OffenerVerdacht = {
  id: string
  detectedAt: Date
  eintraege: {
    id: string
    type: string
    startedAt: Date
    endedAt: Date | null
    durationSec: number | null
    payload: unknown
    note: string | null
    createdByName: string
    createdById: string
  }[]
}

/**
 * Die offenen Verdachtsfaelle mit beiden Eintraegen. Ein Paar, bei dem einer
 * der beiden inzwischen geloescht wurde, hat sich erledigt und wird gleich
 * mit aufgeraeumt.
 */
export async function ladeOffeneVerdachtsfaelle(childId: string): Promise<OffenerVerdacht[]> {
  const verdachte = await prisma.eventDuplicate.findMany({
    where: { childId, status: 'offen' },
    orderBy: { detectedAt: 'desc' },
    take: 50,
  })
  if (verdachte.length === 0) return []

  const ids = verdachte.flatMap((v) => [v.olderEventId, v.newerEventId])
  const events = await prisma.event.findMany({
    where: { id: { in: ids }, deletedAt: null },
    include: { createdBy: { select: { displayName: true } } },
  })
  const byId = new Map(events.map((event) => [event.id, event]))

  const gueltig: OffenerVerdacht[] = []
  const verwaist: string[] = []

  for (const verdacht of verdachte) {
    const aelter = byId.get(verdacht.olderEventId)
    const neuer = byId.get(verdacht.newerEventId)
    if (!aelter || !neuer) {
      verwaist.push(verdacht.id)
      continue
    }
    gueltig.push({
      id: verdacht.id,
      detectedAt: verdacht.detectedAt,
      eintraege: [aelter, neuer].map((event) => ({
        id: event.id,
        type: event.type,
        startedAt: event.startedAt,
        endedAt: event.endedAt,
        durationSec: event.durationSec,
        payload: event.payload,
        note: event.note,
        createdByName: event.createdBy.displayName,
        createdById: event.createdById,
      })),
    })
  }

  if (verwaist.length > 0) {
    await prisma.eventDuplicate.updateMany({
      where: { id: { in: verwaist } },
      data: { status: 'geloescht', resolvedAt: new Date() },
    })
  }

  return gueltig
}
