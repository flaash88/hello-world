import type { Metadata } from 'next'
import { Baby } from 'lucide-react'
import { getAppContext } from '@/lib/household'
import { loadMeasurements } from '@/lib/stats/queries'
import { ageInDays } from '@/lib/time'
import {
  bmiOf,
  evaluateGrowth,
  growthCurves,
  maxAgeDays,
  type Indicator,
  type Sex,
} from '@/lib/growth'
import { correctedAgeDays } from '@/lib/sleep/windows'
import { EmptyState } from '@/components/ui/empty-state'
import { GrowthView } from './growth-view'

export const metadata: Metadata = { title: 'Wachstum' }

export default async function GrowthPage() {
  const ctx = await getAppContext()
  const child = ctx.activeChild

  if (!child?.birthDate) {
    return (
      <EmptyState
        icon={Baby}
        title="Noch kein Geburtsdatum hinterlegt"
        description="Für Perzentile braucht Sprössling das Geburtsdatum und das Geschlecht des Kindes."
      />
    )
  }

  const measurements = await loadMeasurements(child.id)
  const birthDate = child.birthDate
  // Ohne Angabe rechnen wir mit den Mädchen-Kurven und sagen das auch.
  const sex: Sex = child.sex === 'male' ? 'male' : 'female'
  const sexKnown = child.sex === 'male' || child.sex === 'female'

  const points = measurements.map((measurement) => {
    const rawAge = ageInDays(birthDate, measurement.measuredAt, ctx.timezone)
    const age = correctedAgeDays(rawAge, birthDate, child.dueDate)
    const bmi =
      measurement.weightKg !== null && measurement.lengthCm !== null
        ? bmiOf(measurement.weightKg, measurement.lengthCm)
        : null

    const evaluate = (indicator: Indicator, value: number | null) =>
      value === null ? null : evaluateGrowth(indicator, sex, value, age)

    return {
      id: measurement.id,
      measuredAt: measurement.measuredAt.toISOString(),
      ageDays: age,
      correctedFromDays: rawAge !== age ? rawAge : null,
      weightKg: measurement.weightKg,
      lengthCm: measurement.lengthCm,
      headCm: measurement.headCm,
      bmi,
      note: measurement.note,
      results: {
        weight: evaluate('weight', measurement.weightKg),
        length: evaluate('length', measurement.lengthCm),
        head: evaluate('head', measurement.headCm),
        bmi: evaluate('bmi', bmi),
      },
    }
  })

  const currentAge = correctedAgeDays(
    ageInDays(birthDate, new Date(), ctx.timezone),
    birthDate,
    child.dueDate,
  )
  // Die Kurven reichen etwas über das heutige Alter hinaus, damit der letzte
  // Punkt nicht am Diagrammrand klebt.
  const curveTo = Math.min(maxAgeDays(), Math.max(90, currentAge * 1.25))
  const curves = {
    weight: growthCurves('weight', sex, 0, curveTo),
    length: growthCurves('length', sex, 0, curveTo),
    head: growthCurves('head', sex, 0, curveTo),
    bmi: growthCurves('bmi', sex, 0, curveTo),
  }

  return (
    <GrowthView
      childId={child.id}
      childName={child.name}
      sexKnown={sexKnown}
      hasCorrectedAge={Boolean(child.dueDate)}
      currentAgeDays={currentAge}
      points={points}
      curves={curves}
    />
  )
}
