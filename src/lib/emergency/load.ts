import 'server-only'
import { prisma } from '@/lib/db'
import { formatAge, formatDateLong, formatDateShort } from '@/lib/time'
import { formatWeight, unitPrefsFrom } from '@/lib/units'
import { loadImpfplan } from '@/lib/vorsorge/load'
import {
  allergienAus,
  dauermedikamenteAus,
  istKontaktRolle,
  type HealthEintrag,
  type Impfzeile,
  type NotfallKarte,
} from './card'

/** So weit zurueck werden Allergien und Dauermedikamente gesucht. */
const RUECKBLICK_TAGE = 730
/** So viele Impfungen stehen auf der Karte – die letzten, chronologisch. */
const IMPFUNGEN_MAX = 5

/**
 * Baut die Notfallkarte aus den vorhandenen Quellen zusammen. Wird sowohl von
 * der Seite als auch von `/api/notfall` benutzt, damit der Browser dieselben
 * Daten in IndexedDB spiegelt, die er auch angezeigt bekommt.
 */
export async function ladeNotfallKarte(
  householdId: string,
  childId: string,
): Promise<NotfallKarte | null> {
  const child = await prisma.child.findFirst({ where: { id: childId, householdId } })
  if (!child) return null

  const now = new Date()
  const seit = new Date(now.getTime() - RUECKBLICK_TAGE * 86400_000)

  const [household, gesundheit, messung, kontakte, vorsorge] = await Promise.all([
    prisma.household.findUniqueOrThrow({
      where: { id: householdId },
      select: { timezone: true, settings: true },
    }),
    prisma.event.findMany({
      where: { childId, type: 'health', deletedAt: null, startedAt: { gte: seit } },
      orderBy: { startedAt: 'asc' },
      select: { payload: true },
    }),
    prisma.growthMeasurement.findFirst({
      where: { childId, weightKg: { not: null } },
      orderBy: { measuredAt: 'desc' },
      select: { weightKg: true, measuredAt: true },
    }),
    prisma.emergencyContact.findMany({
      where: { householdId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.vorsorgeEntry.findMany({
      where: { childId, kind: 'impfung' },
      orderBy: { doneAt: 'desc' },
      take: IMPFUNGEN_MAX,
    }),
  ])

  const tz = household.timezone
  const units = unitPrefsFrom(household.settings)
  const eintraege = gesundheit.map((row) => (row.payload ?? {}) as HealthEintrag)

  // Die Impfungen kommen aus der Vorsorge – nur die Namen, kein Urteil.
  const plan = await loadImpfplan()
  const impfungen: Impfzeile[] = vorsorge
    .map((eintrag) => ({
      titel: plan.impfungen.find((i) => i.key === eintrag.templateKey)?.name ?? eintrag.templateKey,
      datum: formatDateShort(eintrag.doneAt, tz),
      am: eintrag.doneAt.getTime(),
    }))
    .sort((a, b) => a.am - b.am)
    .map(({ titel, datum }) => ({ titel, datum }))

  return {
    stand: now.toISOString(),
    kind: {
      name: child.name,
      geburtsdatum: child.birthDate ? formatDateLong(child.birthDate, tz) : null,
      alter: child.birthDate ? formatAge(child.birthDate, now, tz) : null,
      gewicht: messung?.weightKg != null ? formatWeight(messung.weightKg, units) : null,
      gewichtVom: messung?.measuredAt ? formatDateShort(messung.measuredAt, tz) : null,
      blutgruppe: child.bloodGroup,
      allergien: allergienAus(eintraege),
      dauermedikamente: dauermedikamenteAus(eintraege),
      vorerkrankungen: child.conditions,
    },
    adresse: household.settings?.emergencyAddress ?? null,
    kontakte: kontakte.map((kontakt) => ({
      id: kontakt.id,
      rolle: istKontaktRolle(kontakt.role) ? kontakt.role : 'frei',
      name: kontakt.name,
      nummer: kontakt.phone,
    })),
    impfungen,
  }
}
