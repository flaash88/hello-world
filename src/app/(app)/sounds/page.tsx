import type { Metadata } from 'next'
import { prisma } from '@/lib/db'
import { getAppContext } from '@/lib/household'
import type { CustomSoundDto } from '@/lib/actions/sounds'
import { BackLink } from '@/components/layout/back-link'
import { SoundBoard } from './sound-board'
import { MedicalDisclaimer } from '@/components/medical-disclaimer'

export const metadata: Metadata = { title: 'Einschlafgeräusche' }

export default async function SoundsPage() {
  const ctx = await getAppContext()
  const own = await prisma.customSound.findMany({
    where: { householdId: ctx.household.id },
    orderBy: { createdAt: 'desc' },
    include: { createdBy: { select: { displayName: true } } },
  })
  const customSounds: CustomSoundDto[] = own.map((sound) => ({
    id: sound.id,
    name: sound.name,
    url: `/api/uploads/${sound.path}`,
    bytes: sound.bytes,
    createdBy: sound.createdBy.displayName,
  }))

  return (
    <div className="flex flex-col gap-4">
      <BackLink href="/mehr" label="Mehr" />
      <h1 className="font-display text-2xl font-bold">Einschlafgeräusche</h1>
      <p className="text-muted-foreground">
        Die mitgelieferten Geräusche entstehen direkt im Browser – nichts wird heruntergeladen,
        nichts wiederholt sich hörbar, und die Laufzeit ist unbegrenzt. Eigene Dateien könnt ihr
        unten hinzufügen.
      </p>
      <SoundBoard customSounds={customSounds} />
      <MedicalDisclaimer>
        Dauerbeschallung ist nicht nötig und nicht empfohlen. Stellt das Gerät mindestens einen
        Meter vom Bett entfernt auf, wählt eine Lautstärke, bei der ihr euch noch normal
        unterhalten könnt, und nutzt den Timer statt der ganzen Nacht.
      </MedicalDisclaimer>
    </div>
  )
}
