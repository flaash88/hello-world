import { getAppContext } from '@/lib/household'
import { ThemeProvider } from '@/components/theme-provider'
import { ToastProvider } from '@/components/ui/toast'
import { AppHeader } from '@/components/layout/app-header'
import { BottomNav } from '@/components/layout/bottom-nav'
import { RealtimeProvider } from '@/components/realtime/realtime-provider'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAppContext()
  const settings = ctx.household.settings

  return (
    <ThemeProvider
      nightStart={settings?.nightModeStart ?? '20:00'}
      nightEnd={settings?.nightModeEnd ?? '06:00'}
      autoEnabled={settings?.nightModeAuto ?? true}
    >
      <ToastProvider>
        <RealtimeProvider childId={ctx.activeChild?.id ?? null}>
          <div className="flex min-h-dvh flex-col">
            <AppHeader ctx={ctx} />
            <main className="mx-auto w-full max-w-2xl flex-1 px-3 pb-40 pt-4">{children}</main>
            <BottomNav />
          </div>
        </RealtimeProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}
