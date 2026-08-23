import type { Metadata } from 'next'
import { getAppContext } from '@/lib/household'
import { prisma } from '@/lib/db'
import { ADMIN_LIST_KEY, ensureAdminChecklist } from '@/lib/wissen/admin-checklist'
import { ADMIN_SOURCES, ADMIN_STAND, ADMIN_TASKS } from '@/lib/content/austria'
import { BackLink } from '@/components/layout/back-link'
import { AdminChecklist, type AdminItem } from './admin-checklist'

export const metadata: Metadata = { title: 'Behördenwege' }

export default async function AdminPage() {
  const ctx = await getAppContext()
  await ensureAdminChecklist(ctx.household.id)

  const rows = await prisma.checklistItem.findMany({
    where: { householdId: ctx.household.id, listKey: ADMIN_LIST_KEY },
    orderBy: { sortOrder: 'asc' },
    include: { doneBy: { select: { displayName: true, initials: true, color: true } } },
  })

  // Der gespeicherte Eintrag traegt nur den Zustand; Frist, Stelle und Hinweis
  // kommen aus der Vorlage. So bleibt der Text aktualisierbar, ohne dass ein
  // Haken verloren geht.
  const byKey = new Map(ADMIN_TASKS.map((task) => [task.key, task]))
  const items: AdminItem[] = rows
    .map((row) => {
      const task = row.templateKey ? byKey.get(row.templateKey) : undefined
      if (!task) return null
      return {
        id: row.id,
        done: row.done,
        doneBy: row.doneBy
          ? { name: row.doneBy.displayName, initials: row.doneBy.initials, color: row.doneBy.color }
          : null,
        task: {
          key: task.key,
          phase: task.phase,
          section: task.section,
          label: task.label,
          deadline: task.deadline,
          authority: task.authority,
          needs: task.needs ?? [],
          note: task.note ?? null,
          automatic: task.automatic ?? false,
        },
      }
    })
    .filter((item): item is AdminItem => item !== null)

  return (
    <div className="flex flex-col gap-4">
      <BackLink href="/wissen" label="Wissen" />
      <h1 className="font-display text-2xl font-bold">Behördenwege</h1>
      <p className="text-muted-foreground">
        Was in Österreich rund um die Geburt zu melden ist – mit den Fristen, die man am leichtesten
        übersieht. Abhaken könnt ihr beide, und beide sehen den Stand.
      </p>

      <AdminChecklist items={items} />

      <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground">
        <p>
          <span className="font-semibold text-foreground">Stand: {ADMIN_STAND}.</span> Fristen und
          Beträge ändern sich. Verbindlich ist die Auskunft der zuständigen Stelle – die steht bei
          jedem Eintrag dabei.
        </p>
        <ul className="flex flex-col gap-0.5">
          {ADMIN_SOURCES.map((source) => (
            <li key={source}>· {source}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
