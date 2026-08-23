import { requireFeature } from '@/lib/settings/features-server'

/**
 * Der Entwicklungsbereich ist abschaltbar. Ist er aus, existiert er auch
 * nicht: die Wache greift fuer alle Unterseiten und leitet auf das Dashboard
 * um, statt eine Erklaerung anzuzeigen.
 */
export default async function EntwicklungLayout({ children }: { children: React.ReactNode }) {
  await requireFeature('entwicklung')
  return <>{children}</>
}
