import 'server-only'
import { cookies } from 'next/headers'
import { cache } from 'react'
import { prisma } from '@/lib/db'
import { requireUser, type SessionUser } from '@/lib/auth/session'
import type { Child, Household, HouseholdSettings, Pregnancy, User } from '@prisma/client'

export const ACTIVE_CHILD_COOKIE = 'sp_child'

export type AppContext = {
  user: SessionUser
  household: Household & { settings: HouseholdSettings | null }
  members: Pick<User, 'id' | 'displayName' | 'initials' | 'color'>[]
  children: Child[]
  activeChild: Child | null
  pregnancy: Pregnancy | null
  timezone: string
}

/**
 * Ein Ladevorgang fuer alles, was praktisch jede Seite braucht. Pro Request
 * memoisiert, damit Layout und Page sich denselben Aufruf teilen.
 */
export const getAppContext = cache(async (): Promise<AppContext> => {
  const user = await requireUser()

  const [household, members, children, pregnancy] = await Promise.all([
    prisma.household.findUniqueOrThrow({
      where: { id: user.householdId },
      include: { settings: true },
    }),
    prisma.user.findMany({
      where: { householdId: user.householdId },
      select: { id: true, displayName: true, initials: true, color: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.child.findMany({
      where: { householdId: user.householdId, archived: false },
      orderBy: [{ birthDate: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.pregnancy.findFirst({
      where: { householdId: user.householdId, active: true },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  const store = await cookies()
  const wanted = store.get(ACTIVE_CHILD_COOKIE)?.value
  const activeChild = children.find((c) => c.id === wanted) ?? children[0] ?? null

  return {
    user,
    household,
    members,
    children,
    activeChild,
    pregnancy,
    timezone: household.timezone,
  }
})

/** Wirft, wenn kein Kind angelegt ist – fuer Seiten die zwingend eines brauchen. */
export async function requireActiveChild(): Promise<{ ctx: AppContext; child: Child }> {
  const ctx = await getAppContext()
  if (!ctx.activeChild) throw new Error('Kein aktives Kind ausgewählt')
  return { ctx, child: ctx.activeChild }
}

/** Prueft, dass ein Kind wirklich zum Haushalt des Users gehoert. */
export async function assertChildInHousehold(childId: string, householdId: string): Promise<Child> {
  const child = await prisma.child.findFirst({ where: { id: childId, householdId } })
  if (!child) throw new Error('Kind nicht gefunden')
  return child
}
