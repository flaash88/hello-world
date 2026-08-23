import 'server-only'
import { prisma } from '@/lib/db'
import { ADMIN_TASKS } from '@/lib/content/austria'

/**
 * Legt die Behoerdenwege als abhakbare Liste im Haushalt an.
 *
 * Bewusst dieselbe Mechanik wie bei der Kliniktasche: Die Vorlage wird einmal
 * in die Datenbank kopiert, danach gehoert die Liste euch. Neue Eintraege aus
 * einer spaeteren Version werden ueber `templateKey` nachgezogen, ohne dass
 * abgehakte Punkte zurueckgesetzt werden.
 *
 * Keine Server Action: Diese Funktion laeuft beim Rendern der Seite, und
 * Server Actions duerfen dort nicht aufgerufen werden.
 */
export const ADMIN_LIST_KEY = 'behoerdenwege'

export async function ensureAdminChecklist(householdId: string): Promise<number> {
  const existing = await prisma.checklistItem.findMany({
    where: { householdId, listKey: ADMIN_LIST_KEY },
    select: { templateKey: true },
  })
  const known = new Set(existing.map((item) => item.templateKey))
  const missing = ADMIN_TASKS.filter((task) => !known.has(task.key))
  if (missing.length === 0) return 0

  await prisma.checklistItem.createMany({
    data: missing.map((task) => ({
      householdId,
      listKey: ADMIN_LIST_KEY,
      templateKey: task.key,
      // Die Phase steht im Abschnitt, damit die Liste auch ohne die Vorlage
      // lesbar bleibt – etwa im JSON-Export.
      section: task.phase,
      label: task.label,
      note: task.deadline,
      sortOrder: ADMIN_TASKS.indexOf(task),
    })),
    skipDuplicates: true,
  })
  return missing.length
}
