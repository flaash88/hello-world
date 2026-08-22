import type { Metadata } from 'next'
import { getAppContext } from '@/lib/household'
import { prisma } from '@/lib/db'
import { pushConfigured } from '@/lib/push/send'
import { BackLink } from '@/components/layout/back-link'
import { NotificationSettings } from './notification-settings'

export const metadata: Metadata = { title: 'Benachrichtigungen' }

export default async function NotificationsPage() {
  const ctx = await getAppContext()
  const prefs = await prisma.notificationPreference.findUnique({ where: { userId: ctx.user.id } })
  const devices = await prisma.pushSubscription.count({ where: { userId: ctx.user.id } })

  return (
    <div className="flex flex-col gap-4">
      <BackLink href="/mehr" label="Mehr" />
      <h1 className="font-display text-2xl font-bold">Benachrichtigungen</h1>
      <NotificationSettings
        vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''}
        serverConfigured={pushConfigured()}
        deviceCount={devices}
        prefs={{
          napAlerts: prefs?.napAlerts ?? true,
          napLeadMinutes: prefs?.napLeadMinutes ?? 15,
          feedAlerts: prefs?.feedAlerts ?? false,
          medicationAlerts: prefs?.medicationAlerts ?? true,
          appointmentAlerts: prefs?.appointmentAlerts ?? true,
          partnerActivity: prefs?.partnerActivity ?? false,
          quietFrom: prefs?.quietFrom ?? null,
          quietTo: prefs?.quietTo ?? null,
          ntfyEnabled: prefs?.ntfyEnabled ?? false,
        }}
        ntfy={{
          serverUrl: ctx.household.settings?.ntfyServerUrl ?? '',
          topic: ctx.household.settings?.ntfyTopic ?? '',
        }}
      />
    </div>
  )
}
