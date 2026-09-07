import type { Metadata } from 'next'
import type { LucideIcon } from 'lucide-react'
import Link from 'next/link'
import {
  BookHeart,
  BookOpen,
  ChevronRight,
  ClipboardList,
  CopyCheck,
  LineChart,
  LogOut,
  Milk,
  Music,
  Ruler,
  Settings,
  Siren,
  Smile,
  Sparkles,
  Syringe,
  Thermometer,
  Users,
} from 'lucide-react'
import { getAppContext } from '@/lib/household'
import { currentFeatures } from '@/lib/settings/features-server'
import { routeErlaubt } from '@/lib/settings/features'
import { KACHELN, type MenuIconKey } from '@/lib/settings/menu'
import { offeneDuplikate } from '@/lib/events/duplicate-service'
import { logoutAction } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { UserAvatar } from '@/components/ui/avatar'
import { InstallHint } from '@/components/install-hint'

export const metadata: Metadata = { title: 'Mehr' }

const ICONS: Record<MenuIconKey, LucideIcon> = {
  notfall: Siren,
  protokoll: ClipboardList,
  tagebuch: BookHeart,
  vorrat: Milk,
  wachstum: Ruler,
  vorsorge: Syringe,
  fieber: Thermometer,
  zaehne: Smile,
  wissen: BookOpen,
  sounds: Music,
  auswertung: LineChart,
  entwicklung: Sparkles,
  duplikate: CopyCheck,
}

export default async function MorePage() {
  const ctx = await getAppContext()
  const features = await currentFeatures()

  // Abgeschaltete Bereiche stehen nicht als graue Kachel da, sondern gar nicht.
  const kacheln = KACHELN.filter((kachel) => routeErlaubt(features, kachel.href))

  // Ohne Auswertung gaebe es keinen Weg mehr zu den offenen Verdachtsfaellen.
  // Die Kachel kommt nur, wenn wirklich etwas offen ist – und ohne Zahl.
  const duplikate = ctx.activeChild ? await offeneDuplikate(ctx.activeChild.id) : 0
  if (duplikate > 0) {
    kacheln.push({ href: '/duplikate', label: 'Doppelte Einträge', icon: 'duplikate' })
  }

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

      {/*
       * Zwei Spalten statt einer langen Liste: halbe Höhe, und man findet ein
       * Ziel am Symbol, statt zwölf Zeilenanfänge zu lesen.
       */}
      <nav aria-label="Bereiche">
        <ul className="grid grid-cols-2 gap-2">
          {kacheln.map(({ href, label, icon }) => {
            const Icon = ICONS[icon]
            return (
              <li key={href}>
                <Link
                  href={href}
                  className="flex min-h-24 flex-col justify-center gap-1.5 rounded-xl border border-border bg-card px-3 py-3"
                >
                  <Icon className="size-6 text-muted-foreground" aria-hidden />
                  <span className="text-sm font-semibold leading-tight">{label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/*
       * Alles, was man einmal einstellt: hinter einer Zeile. Vorher standen hier
       * zehn weitere Links offen, die im Alltag nie gebraucht werden.
       */}
      <Link
        href="/mehr/einstellungen"
        className="flex min-h-14 items-center gap-3 rounded-xl border border-border bg-card px-4 font-semibold"
      >
        <Settings className="size-5 text-muted-foreground" aria-hidden />
        <span className="flex-1">Einstellungen</span>
        <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
      </Link>

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
