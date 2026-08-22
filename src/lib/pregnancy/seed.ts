import 'server-only'
import { prisma } from '@/lib/db'
import { HOSPITAL_BAG_TEMPLATE } from './hospital-bag'
import { mkpScheduleFor } from './mkp'

/**
 * Einmalige Vorbefuellung von Kliniktasche und Mutter-Kind-Pass-Terminen.
 *
 * Bewusst keine Server Actions: Diese Funktionen werden beim Rendern der
 * jeweiligen Seite aufgerufen, und `revalidatePath` waehrend des Renderns ist
 * nicht erlaubt. Sie sind idempotent – ein zweiter Aufruf legt nichts nach.
 */

export async function ensureHospitalBag(
  householdId: string,
  pregnancyId: string,
): Promise<number> {
  const existing = await prisma.checklistItem.count({
    where: { householdId, listKey: 'hospitalbag' },
  })
  if (existing > 0) return 0

  await prisma.checklistItem.createMany({
    data: HOSPITAL_BAG_TEMPLATE.map((item, index) => ({
      pregnancyId,
      householdId,
      listKey: 'hospitalbag',
      section: item.section,
      label: item.label,
      note: item.note ?? null,
      quantity: item.quantity ?? null,
      sortOrder: index,
    })),
  })
  return HOSPITAL_BAG_TEMPLATE.length
}

export async function ensureMkpAppointments(
  householdId: string,
  pregnancyId: string,
  dueDate: Date,
  createdById: string,
  timezone?: string,
): Promise<number> {
  const existing = await prisma.appointment.findMany({
    where: { pregnancyId, templateKey: { not: null } },
    select: { templateKey: true },
  })
  const known = new Set(existing.map((a) => a.templateKey))
  const missing = mkpScheduleFor(dueDate, timezone).filter((entry) => !known.has(entry.exam.key))
  if (missing.length === 0) return 0

  await prisma.appointment.createMany({
    data: missing.map((entry) => ({
      pregnancyId,
      householdId,
      title: entry.exam.title,
      category: 'mkp',
      windowFrom: entry.windowFrom,
      windowTo: entry.windowTo,
      note: entry.exam.description,
      templateKey: entry.exam.key,
      createdById,
    })),
  })
  return missing.length
}
