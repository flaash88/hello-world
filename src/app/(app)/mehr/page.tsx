import type { Metadata } from 'next'
import Link from 'next/link'
import { BellRing, ChevronRight, Download, LineChart, LogOut, Moon, Music, Ruler, Sparkles, UserPlus, Users } from 'lucide-react'
import { getAppContext } from '@/lib/household'
import { logoutAction } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { UserAvatar } from '@/components/ui/avatar'
import { InstallHint } from '@/components/install-hint'

export const metadata: Metadata = { title: 'Mehr' }

const LINKS = [
  { href: '/mehr/einladung', label: 'Zweite Person einladen', icon: UserPlus },
  { href: '/mehr/benachrichtigungen', label: 'Benachrichtigungen', icon: BellRing },
  { href: '/sounds', label: 'Einschlafgeräusche', icon: Music },
  { href: '/mehr/nachtmodus', label: 'Nachtmodus & Anzeige', icon: Moon },
  { href: '/wachstum', label: 'Wachstum & Perzentile', icon: Ruler },
  { href: '/auswertung', label: 'Auswertung', icon: LineChart },
  { href: '/entwicklung', label: 'Entwicklung & Übungen', icon: Sparkles },
  { href: '/mehr/export', label: 'Export & Backup', icon: Download },
]

export default async function MorePage() {
  const ctx = await getAppContext()

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl font-bold">Mehr</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="size-4 text-muted-foreground" aria-hidden />
            {ctx.household.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {ctx.members.map((member) => (
            <div key={member.id} className="flex items-center gap-3">
              <UserAvatar initials={member.initials} color={member.color} />
              <span className="font-semibold">{member.displayName}</span>
              {member.id === ctx.user.id && (
                <span className="text-xs text-muted-foreground">(du)</span>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <nav aria-label="Einstellungen">
        <ul className="flex flex-col gap-2">
          {LINKS.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className="flex min-h-14 items-center gap-3 rounded-xl border border-border bg-card px-4 font-semibold"
              >
                <Icon className="size-5 text-muted-foreground" aria-hidden />
                <span className="flex-1">{label}</span>
                <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <InstallHint />

      <form action={logoutAction}>
        <Button type="submit" variant="outline" className="w-full">
          <LogOut aria-hidden />
          Abmelden
        </Button>
      </form>

      <p className="pb-4 text-center text-xs text-muted-foreground">
        Sprössling · selbst gehostet · keine Tracker, keine Cloud
      </p>
    </div>
  )
}
