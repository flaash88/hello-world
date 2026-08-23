import { getAppContext } from '@/lib/household'
import { ThemeProvider } from '@/components/theme-provider'
import { UnitsProvider } from '@/components/units-provider'
import { ToastProvider } from '@/components/ui/toast'
import { AppHeader } from '@/components/layout/app-header'
import { BottomNav } from '@/components/layout/bottom-nav'
import { navItemsFor } from '@/components/layout/nav-items'
import { RealtimeProvider } from '@/components/realtime/realtime-provider'
import { DuplicateBanner } from '@/components/tracker/duplicate-banner'
import { OfflineSync } from '@/components/offline/offline-sync'
import { RunningTimerBar } from '@/components/tracker/running-timer-bar'
import { runningTimers } from '@/lib/events/service'
import { unitPrefsFrom } from '@/lib/units'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAppContext()
  const settings = ctx.household.settings
  const timers = ctx.activeChild ? await runningTimers(ctx.activeChild.id) : []

  return (
    <ThemeProvider
      nightStart={settings?.nightModeStart ?? '20:00'}
      nightEnd={settings?.nightModeEnd ?? '06:00'}
      autoEnabled={settings?.nightModeAuto ?? true}
    >
      <UnitsProvider units={unitPrefsFrom(settings)}>
        <ToastProvider>
          <RealtimeProvider childId={ctx.activeChild?.id ?? null}>
            <div className="flex min-h-dvh flex-col" data-child-id={ctx.activeChild?.id ?? ''}>
              <AppHeader ctx={ctx} />
              <main className="mx-auto w-full max-w-2xl flex-1 px-3 pb-44 pt-4">{children}</main>
              <DuplicateBanner />
              <RunningTimerBar
                timers={timers.map((timer) => ({
                  id: timer.id,
                  type: timer.type,
                  startedAt: timer.startedAt.toISOString(),
                  pausedAt: timer.pausedAt?.toISOString() ?? null,
                  pausedSec: timer.pausedSec,
                  payload: timer.payload,
                }))}
              />
              <BottomNav
                items={navItemsFor({
                  hasChild: ctx.children.length > 0,
                  hasPregnancy: Boolean(ctx.pregnancy),
                })}
              />
            </div>
            <OfflineSync />
          </RealtimeProvider>
        </ToastProvider>
      </UnitsProvider>
    </ThemeProvider>
  )
}
