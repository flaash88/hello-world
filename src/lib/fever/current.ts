import 'server-only'
import { prisma } from '@/lib/db'
import { formatTime } from '@/lib/time'
import { localeTag } from '@/lib/i18n'
import { EPISODE_FENSTER_STUNDEN, MESSORT_LABEL, episode, type HealthEvent } from './episode'

export type LaufendeEpisode = { zusammenfassung: string }

/**
 * Kurzfassung fuer das Dashboard: laeuft gerade eine Fieberepisode, und wie
 * war die letzte Messung? Gibt null zurueck, wenn nichts laeuft – dann taucht
 * die Karte gar nicht erst auf.
 */
export async function laufendeFieberEpisode(childId: string): Promise<LaufendeEpisode | null> {
  const seit = new Date(Date.now() - (EPISODE_FENSTER_STUNDEN + 24) * 3600_000)
  const rows = await prisma.event.findMany({
    where: { childId, type: 'health', deletedAt: null, startedAt: { gte: seit } },
    orderBy: { startedAt: 'asc' },
    select: { id: true, startedAt: true, note: true, payload: true },
  })

  const ep = episode(
    rows.map((row) => ({
      id: row.id,
      startedAt: row.startedAt,
      note: row.note,
      payload: (row.payload ?? {}) as HealthEvent['payload'],
    })),
  )
  if (!ep.aktiv) return null

  const letzte = ep.messungen[ep.messungen.length - 1]
  if (!letzte) return null

  const grad = letzte.temperatureC.toLocaleString(localeTag(), {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })
  const ort = letzte.ort ? `, ${MESSORT_LABEL[letzte.ort]}` : ''
  return { zusammenfassung: `Zuletzt ${grad} °C um ${formatTime(letzte.at)}${ort}` }
}
