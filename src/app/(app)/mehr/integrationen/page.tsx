import type { Metadata } from 'next'
import { getAppContext } from '@/lib/household'
import { prisma } from '@/lib/db'
import { formatDateTime } from '@/lib/time'
import { API_TYPES } from '@/lib/api/registry'
import { BackLink } from '@/components/layout/back-link'
import { IntegrationenAnsicht } from './integrationen-ansicht'

export const metadata: Metadata = { title: 'Automationen' }

export default async function IntegrationenPage() {
  const ctx = await getAppContext()
  const tz = ctx.timezone

  const [tokens, webhooks, zugriffe] = await Promise.all([
    prisma.integrationToken.findMany({
      where: { householdId: ctx.household.id },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { displayName: true } } },
    }),
    prisma.webhook.findMany({
      where: { householdId: ctx.household.id },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.apiAuditLog.findMany({
      where: { householdId: ctx.household.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
  ])

  return (
    <div className="flex flex-col gap-4">
      <BackLink href="/mehr" label="Mehr" />
      <h1 className="font-display text-2xl font-bold">Automationen</h1>
      <IntegrationenAnsicht
        types={API_TYPES}
        tokens={tokens.map((token) => ({
          id: token.id,
          name: token.name,
          gehoert: token.user.displayName,
          angelegt: formatDateTime(token.createdAt, tz),
          zuletzt: token.lastUsedAt ? formatDateTime(token.lastUsedAt, tz) : null,
          widerrufen: token.revokedAt !== null,
        }))}
        webhooks={webhooks.map((webhook) => ({
          id: webhook.id,
          url: webhook.url,
          eventTypes: Array.isArray(webhook.eventTypes) ? (webhook.eventTypes as string[]) : [],
          active: webhook.active,
          lastError: webhook.lastError,
          failures: webhook.failures,
          zuletzt: webhook.lastSentAt ? formatDateTime(webhook.lastSentAt, tz) : null,
        }))}
        zugriffe={zugriffe.map((eintrag) => ({
          id: eintrag.id,
          wann: formatDateTime(eintrag.createdAt, tz),
          text: `${eintrag.method} ${eintrag.path} → ${eintrag.status}`,
          detail: eintrag.detail,
        }))}
      />
    </div>
  )
}
