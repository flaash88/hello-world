import type { Metadata } from 'next'
import { getAppContext } from '@/lib/household'
import { OnboardingFlow } from './onboarding-flow'

export const metadata: Metadata = { title: 'Einrichtung' }

export default async function OnboardingPage() {
  const ctx = await getAppContext()
  return (
    <OnboardingFlow
      householdName={ctx.household.name}
      hasChild={ctx.children.length > 0}
      hasPregnancy={Boolean(ctx.pregnancy)}
    />
  )
}
