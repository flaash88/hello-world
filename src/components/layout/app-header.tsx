import Link from 'next/link'
import { Sprout } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { UserAvatar } from '@/components/ui/avatar'
import { ChildSwitcher } from '@/components/layout/child-switcher'
import type { AppContext } from '@/lib/household'

export function AppHeader({ ctx }: { ctx: AppContext }) {
  return (
    <header className="safe-top sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-2xl items-center gap-2 px-3">
        <Link href="/" className="flex items-center gap-2" aria-label="Startseite">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Sprout className="size-5" aria-hidden />
          </span>
        </Link>
        <div className="min-w-0 flex-1">
          <ChildSwitcher childList={ctx.children} activeChildId={ctx.activeChild?.id ?? null} />
        </div>
        <ThemeToggle />
        <Link href="/mehr" aria-label="Einstellungen und Profil">
          <UserAvatar
            initials={ctx.user.initials}
            color={ctx.user.color}
            title={ctx.user.displayName}
          />
        </Link>
      </div>
    </header>
  )
}
