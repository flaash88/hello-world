import type { Metadata } from 'next'
import { BackLink } from '@/components/layout/back-link'
import { MedicalDisclaimer } from '@/components/medical-disclaimer'
import { FoodCheck } from './food-check'

export const metadata: Metadata = { title: 'Darf ich das essen?' }

export default function FoodPage() {
  return (
    <div className="flex flex-col gap-4">
      <BackLink href="/wissen" label="Wissen" />
      <h1 className="font-display text-2xl font-bold">Darf ich das essen?</h1>
      <p className="text-muted-foreground">
        Tipp ein, was auf dem Teller liegt. Die Antwort kommt sofort und ohne Internet – die Liste
        liegt auf eurem Server.
      </p>

      <FoodCheck />

      <MedicalDisclaimer>
        Die Einordnung folgt den Empfehlungen der AGES zu Listerien, Toxoplasmose und sicherem
        Garen. Sie gilt für eine normal verlaufende Schwangerschaft – bei Erkrankungen,
        Unverträglichkeiten oder auffälligen Werten zählt, was deine Ärztin oder Hebamme sagt.
      </MedicalDisclaimer>
    </div>
  )
}
