import type { Metadata } from 'next'
import Link from 'next/link'
import { ScanSearch } from 'lucide-react'
import { getAppContext } from '@/lib/household'
import { gestationalAge } from '@/lib/pregnancy/weeks'
import { trimesterForWeek } from '@/lib/content/nutrition'
import { BackLink } from '@/components/layout/back-link'
import { MedicalDisclaimer } from '@/components/medical-disclaimer'
import { NutritionView } from './nutrition-view'

export const metadata: Metadata = { title: 'Ernährung' }

export default async function NutritionPage() {
  const ctx = await getAppContext()
  // Die Woche wird serverseitig bestimmt – im Browser waere sie je nach
  // Zeitzone des Geraets einen Tag daneben.
  const age = ctx.pregnancy ? gestationalAge(ctx.pregnancy.dueDate, new Date(), ctx.timezone) : null
  const current = age ? trimesterForWeek(age.week) : null

  return (
    <div className="flex flex-col gap-4">
      <BackLink href="/wissen" label="Wissen" />
      <h1 className="font-display text-2xl font-bold">Ernährung</h1>
      <p className="text-muted-foreground">
        Es geht nicht um Menge – der Mehrbedarf ist kleiner, als alle sagen. Es geht um eine
        Handvoll Nährstoffe, bei denen es sich lohnt, hinzuschauen.
      </p>

      <NutritionView current={current} week={age?.week ?? null} />

      <Link
        href="/wissen/lebensmittel"
        className="flex min-h-14 items-center justify-center gap-2 rounded-xl border-2 border-border px-4 font-semibold"
      >
        <ScanSearch className="size-5" aria-hidden />
        Darf ich das essen?
      </Link>

      <MedicalDisclaimer>
        Die Angaben folgen den österreichischen Empfehlungen von AGES und Gesundheitsportal. Was für
        dich gilt – besonders bei Eisenmangel, Schilddrüse, Diabetes oder veganer Ernährung –
        entscheidet deine Ärztin, nicht diese Seite.
      </MedicalDisclaimer>
    </div>
  )
}
