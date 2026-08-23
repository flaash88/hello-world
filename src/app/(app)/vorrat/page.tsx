import type { Metadata } from 'next'
import { getAppContext } from '@/lib/household'
import { prisma } from '@/lib/db'
import { formatDateShort } from '@/lib/time'
import {
  abgelaufene,
  alsNaechstes,
  gruppen,
  statistik,
  type Portion,
  type PortionZustand,
} from '@/lib/milk/portions'
import {
  LAGERORT_HINWEIS,
  LAGERORT_LABEL,
  haltbarkeitText,
  haltbarkeitenAusSettings,
} from '@/lib/milk/storage'
import { VorratAnsicht } from './vorrat-ansicht'
import type { GruppeView, PortionView } from './types'

export const metadata: Metadata = { title: 'Milchvorrat' }

export default async function VorratPage() {
  const ctx = await getAppContext()
  const settings = ctx.household.settings
  const haltbarkeiten = haltbarkeitenAusSettings(settings)
  const tz = ctx.timezone
  const now = new Date()

  const rows = await prisma.milkPortion.findMany({
    where: { householdId: ctx.household.id },
    orderBy: { abgepumptAm: 'desc' },
  })
  const portionen = rows as Portion[]

  const toView = (zustand: PortionZustand): PortionView => ({
    id: zustand.portion.id,
    abgepumptAm: zustand.portion.abgepumptAm.toISOString(),
    abgepumptText: formatDateShort(zustand.portion.abgepumptAm, tz),
    mengeMl: zustand.portion.mengeMl,
    lagerort: zustand.portion.lagerort,
    lagerortLabel:
      LAGERORT_LABEL[zustand.portion.lagerort as keyof typeof LAGERORT_LABEL] ??
      zustand.portion.lagerort,
    behaelter: zustand.portion.behaelter,
    notiz: zustand.portion.notiz,
    ablauf: zustand.ablauf.toISOString(),
    ablaufText: zustand.text,
    abgelaufen: zustand.abgelaufen,
    aufgetaut: zustand.aufgetaut,
  })

  const gruppenView: GruppeView[] = gruppen(portionen, haltbarkeiten, now, tz).map((gruppe) => ({
    lagerort: gruppe.lagerort,
    label: gruppe.label,
    hinweis: LAGERORT_HINWEIS[gruppe.lagerort],
    summeMl: gruppe.summeMl,
    anzahl: gruppe.anzahl,
    haltbarkeitText: haltbarkeitText(haltbarkeiten[gruppe.lagerort]),
    portionen: gruppe.portionen.map(toView),
  }))

  const naechste = alsNaechstes(portionen, haltbarkeiten, now)
  const hinueber = abgelaufene(portionen, haltbarkeiten, now)

  return (
    <VorratAnsicht
      childId={ctx.activeChild?.id ?? null}
      gruppen={gruppenView}
      naechste={naechste ? toView(naechste) : null}
      abgelaufen={hinueber.map(toView)}
      statistik={statistik(portionen, haltbarkeiten, now)}
      aufgetautText={haltbarkeitText(haltbarkeiten.aufgetaut)}
      einstellungen={{
        milkFridgeHours: settings?.milkFridgeHours ?? haltbarkeiten.kuehlschrank,
        milkFreezerHours: settings?.milkFreezerHours ?? haltbarkeiten.gefrierfach,
        milkDeepFreezeHours: settings?.milkDeepFreezeHours ?? haltbarkeiten.tiefkuehler,
        milkThawedHours: settings?.milkThawedHours ?? haltbarkeiten.aufgetaut,
        milkExpiryPush: settings?.milkExpiryPush ?? true,
      }}
    />
  )
}
