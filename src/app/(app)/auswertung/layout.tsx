import { requireFeature } from '@/lib/settings/features-server'

/** Auswertungen sind abschaltbar – siehe lib/settings/features.ts. */
export default async function AuswertungLayout({ children }: { children: React.ReactNode }) {
  await requireFeature('auswertung')
  return <>{children}</>
}
