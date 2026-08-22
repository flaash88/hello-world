import type { Metadata } from 'next'
import { BackLink } from '@/components/layout/back-link'
import { SoundBoard } from './sound-board'
import { MedicalDisclaimer } from '@/components/medical-disclaimer'

export const metadata: Metadata = { title: 'Einschlafgeräusche' }

export default function SoundsPage() {
  return (
    <div className="flex flex-col gap-4">
      <BackLink href="/mehr" label="Mehr" />
      <h1 className="font-display text-2xl font-bold">Einschlafgeräusche</h1>
      <p className="text-muted-foreground">
        Alle Geräusche entstehen direkt im Browser – nichts wird heruntergeladen, nichts wiederholt
        sich hörbar, und die Laufzeit ist unbegrenzt.
      </p>
      <SoundBoard />
      <MedicalDisclaimer>
        Dauerbeschallung ist nicht nötig und nicht empfohlen. Stellt das Gerät mindestens einen
        Meter vom Bett entfernt auf, wählt eine Lautstärke, bei der ihr euch noch normal
        unterhalten könnt, und nutzt den Timer statt der ganzen Nacht.
      </MedicalDisclaimer>
    </div>
  )
}
