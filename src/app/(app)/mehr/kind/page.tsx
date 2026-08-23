import type { Metadata } from 'next'
import { getAppContext } from '@/lib/household'
import { correctedAgeDays } from '@/lib/sleep/windows'
import { ageInDays, formatAge, localDateKey } from '@/lib/time'
import { BackLink } from '@/components/layout/back-link'
import { ChildSettings, type ChildProfile } from './child-settings'

export const metadata: Metadata = { title: 'Kindprofil' }

export default async function ChildSettingsPage() {
  const ctx = await getAppContext()
  const now = new Date()

  const profiles: ChildProfile[] = ctx.children.map((child) => {
    const rawAge = child.birthDate ? ageInDays(child.birthDate, now, ctx.timezone) : null
    const corrected =
      rawAge !== null && child.birthDate
        ? correctedAgeDays(rawAge, child.birthDate, child.dueDate)
        : null
    return {
      id: child.id,
      name: child.name,
      // Datumsfelder werden serverseitig in die lokale Zeitzone gerechnet –
      // im Browser wäre das je nach Gerät ein Tag daneben.
      birthDate: child.birthDate ? localDateKey(child.birthDate, ctx.timezone) : '',
      dueDate: child.dueDate ? localDateKey(child.dueDate, ctx.timezone) : '',
      sex: child.sex === 'male' ? 'male' : child.sex === 'female' ? 'female' : 'unknown',
      ageLabel: child.birthDate ? formatAge(child.birthDate, now, ctx.timezone) : null,
      correctedWeeks:
        corrected !== null && rawAge !== null && corrected !== rawAge
          ? Math.floor(corrected / 7)
          : null,
      isActive: child.id === ctx.activeChild?.id,
    }
  })

  return (
    <div className="flex flex-col gap-4">
      <BackLink href="/mehr" label="Mehr" />
      <h1 className="font-display text-2xl font-bold">Kindprofil</h1>
      <ChildSettings profiles={profiles} />
    </div>
  )
}
