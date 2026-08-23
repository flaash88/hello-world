import { prisma } from '@/lib/db'
import { apiAntwort } from '@/lib/api/auth'
import { mitApi } from '@/lib/api/handler'
import { analyseSleep } from '@/lib/sleep/analysis'
import { featureState } from '@/lib/settings/features'
import { lastEventPerType } from '@/lib/events/queries'
import { addDays, startOfLocalDay } from '@/lib/time'
import { episode, intervalle, type HealthEvent } from '@/lib/fever/episode'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Kompakter Zustand fuer Home-Assistant-Sensoren.
 *
 * Absichtlich flach und ohne Verschachtelung: in HA wird daraus eine Handvoll
 * `value_template`-Ausdruecke, und die sollen kurz bleiben.
 */
export async function GET(request: Request): Promise<Response> {
  return mitApi(request, async (ctx) => {
    const now = new Date()

    const child = await prisma.child.findUniqueOrThrow({ where: { id: ctx.childId } })
    const household = await prisma.household.findUniqueOrThrow({
      where: { id: ctx.householdId },
      select: { timezone: true, featureLevel: true, featureOverrides: true, featurePauseUntil: true },
    })
    const tz = household.timezone
    // Die API zeigt nur, was die App auch zeigt: ist der Schlafrhythmus aus,
    // gibt es hier keine Vorhersage – sonst waere der Schalter eine Attrappe.
    const features = featureState(
      {
        level: household.featureLevel,
        overrides: household.featureOverrides,
        pauseUntil: household.featurePauseUntil,
      },
      now,
    )

    const tagBeginn = startOfLocalDay(now, tz)
    const [analyse, letzte, windelnHeute, gesundheit] = await Promise.all([
      analyseSleep(child, tz, now),
      lastEventPerType(ctx.childId),
      prisma.event.count({
        where: { childId: ctx.childId, type: 'diaper', deletedAt: null, startedAt: { gte: tagBeginn } },
      }),
      prisma.event.findMany({
        where: {
          childId: ctx.childId,
          type: 'health',
          deletedAt: null,
          startedAt: { gte: addDays(tagBeginn, -4, tz) },
        },
        orderBy: { startedAt: 'asc' },
        select: { id: true, startedAt: true, note: true, payload: true },
      }),
    ])

    const laufend = [...letzte.values()].find((event) => event.running)
    const letzteMahlzeit = ['nursing', 'bottle', 'solids']
      .map((type) => letzte.get(type))
      .filter((event): event is NonNullable<typeof event> => Boolean(event))
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0]

    const letzterSchlaf = letzte.get('sleep')

    // Fieber nur, wenn gerade eine Episode laeuft – sonst waere es Rauschen.
    const ep = episode(
      gesundheit.map((row) => ({
        id: row.id,
        startedAt: row.startedAt,
        note: row.note,
        payload: (row.payload ?? {}) as HealthEvent['payload'],
      })),
      now,
    )
    const letzteTemperatur = ep.aktiv ? ep.messungen[ep.messungen.length - 1] : null
    const naechsteDosis = ep.aktiv
      ? intervalle(ep.gaben, now, tz).find((eintrag) => eintrag.fruehestensAb !== null)
      : null

    return apiAntwort({
      kind: { id: child.id, name: child.name },
      jetzt: now.toISOString(),
      laufenderTimer: laufend ? { type: laufend.type, seit: laufend.startedAt } : null,
      letzteMahlzeit: letzteMahlzeit
        ? { type: letzteMahlzeit.type, at: letzteMahlzeit.startedAt }
        : null,
      letzterSchlaf: letzterSchlaf
        ? {
            von: letzterSchlaf.startedAt,
            bis: letzterSchlaf.endedAt,
            laeuft: letzterSchlaf.running,
          }
        : null,
      // Wach seit dem Ende des letzten Schlafs; waehrend geschlafen wird, ist
      // die Frage gegenstandslos.
      wachSeitMinuten:
        analyse.sleepingSince !== null || analyse.lastWakeAt === null
          ? null
          : Math.round((now.getTime() - analyse.lastWakeAt.getTime()) / 60_000),
      naechstesSchlaffenster:
        analyse.forecast && features.aktiv.has('schlafanalyse')
          ? {
              von: analyse.forecast.from.toISOString(),
              bis: analyse.forecast.to.toISOString(),
              konfidenz: Math.round(analyse.forecast.confidence * 100) / 100,
              kalibriert: !analyse.forecast.calibrating,
            }
          : null,
      windelnHeute,
      fieber: letzteTemperatur
        ? {
            aktiv: true,
            temperaturC: letzteTemperatur.temperatureC,
            gemessenAm: letzteTemperatur.at.toISOString(),
            messort: letzteTemperatur.ort,
            naechsteDosisAb: naechsteDosis?.fruehestensAb?.toISOString() ?? null,
            mittel: naechsteDosis?.mittel ?? null,
          }
        : { aktiv: false },
    })
  })
}
