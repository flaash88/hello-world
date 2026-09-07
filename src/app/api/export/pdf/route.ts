import { getCurrentUser } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { loadStats } from '@/lib/stats/queries'
import { buildWeeklyReview } from '@/lib/stats/weekly-review'
import { buildWeeklyReportPdf } from '@/lib/export/weekly-report'
import { evaluateGrowth, shortPercentile, type Sex } from '@/lib/growth'
import { formatUnit, unitPrefsFrom } from '@/lib/units'
import { correctedAgeDays } from '@/lib/sleep/windows'
import { ageInDays, formatAge, localDateKey } from '@/lib/time'
import { featureState } from '@/lib/settings/features'
import { pdfAntwort } from '@/lib/print/antwort'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** Wochenbericht als PDF: /api/export/pdf?offset=-1 fuer die Vorwoche. */
export async function GET(request: Request): Promise<Response> {
  const user = await getCurrentUser()
  if (!user) return new Response('Nicht angemeldet', { status: 401 })

  const url = new URL(request.url)
  const offset = Math.min(0, Number(url.searchParams.get('offset')) || 0)
  const childId = url.searchParams.get('kind')

  const household = await prisma.household.findUniqueOrThrow({
    where: { id: user.householdId },
    select: {
      name: true,
      timezone: true,
      settings: true,
      featureLevel: true,
      featureOverrides: true,
      featurePauseUntil: true,
    },
  })
  // Der Wochenbericht ist eine Auswertung. Ist die aus, gibt es ihn nicht –
  // auch nicht ueber die URL an der Oberflaeche vorbei.
  const features = featureState({
    level: household.featureLevel,
    overrides: household.featureOverrides,
    pauseUntil: household.featurePauseUntil,
  })
  if (!features.aktiv.has('auswertung')) return new Response('Nicht verfügbar', { status: 404 })
  const child = childId
    ? await prisma.child.findFirst({ where: { id: childId, householdId: user.householdId } })
    : await prisma.child.findFirst({ where: { householdId: user.householdId, archived: false } })
  if (!child) return new Response('Kein Kind gefunden', { status: 404 })

  const units = unitPrefsFrom(household.settings)

  const [stats, previous] = await Promise.all([
    loadStats(child.id, 'week', household.timezone, offset),
    loadStats(child.id, 'week', household.timezone, offset - 1),
  ])

  // Wachstumswerte der Woche, falls in diesem Zeitraum gemessen wurde.
  const measurements = await prisma.growthMeasurement.findMany({
    where: { childId: child.id, measuredAt: { gte: stats.from, lt: stats.to } },
    orderBy: { measuredAt: 'desc' },
    take: 1,
  })
  const growth: { label: string; value: string }[] = []
  const latest = measurements[0]
  if (latest && child.birthDate) {
    const sex: Sex = child.sex === 'male' ? 'male' : 'female'
    const age = correctedAgeDays(
      ageInDays(child.birthDate, latest.measuredAt, household.timezone),
      child.birthDate,
      child.dueDate,
    )
    const add = (label: string, value: number | null, indicator: 'weight' | 'length' | 'head') => {
      if (value === null) return
      const result = evaluateGrowth(indicator, sex, value, age)
      growth.push({
        label,
        value: `${formatUnit(indicator === 'weight' ? 'weight' : 'length', value, units)} (${shortPercentile(result.percentile)})`,
      })
    }
    add('Gewicht', latest.weightKg, 'weight')
    add('Länge', latest.lengthCm, 'length')
    add('Kopfumfang', latest.headCm, 'head')
  }

  const bytes = await buildWeeklyReportPdf({
    childName: child.name,
    childAgeLabel: child.birthDate
      ? formatAge(child.birthDate, stats.to, household.timezone)
      : null,
    householdName: household.name,
    stats,
    timezone: household.timezone,
    units,
    growth,
    summary: buildWeeklyReview(stats, previous, child.name),
  })

  const filename = `sproessling-woche-${localDateKey(stats.from, household.timezone)}.pdf`
  return pdfAntwort(bytes, filename)
}
