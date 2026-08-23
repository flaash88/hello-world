import type { Metadata } from 'next'
import type { LucideIcon } from 'lucide-react'
import Link from 'next/link'
import {
  Baby,
  BellRing,
  BookHeart,
  BookOpen,
  ChevronRight,
  ClipboardList,
  Download,
  HardDriveDownload,
  KeyRound,
  LineChart,
  LogOut,
  Milk,
  Moon,
  Music,
  Ruler,
  ShieldAlert,
  Siren,
  Sparkles,
  Smile,
  SlidersHorizontal,
  SquareDashedBottom,
  Syringe,
  Thermometer,
  UserPlus,
  Users,
  CopyCheck,
} from 'lucide-react'
import { getAppContext } from '@/lib/household'
import { currentFeatures } from '@/lib/settings/features-server'
import { offeneDuplikate } from '@/lib/events/duplicate-service'
import { routeErlaubt } from '@/lib/settings/features'
import { logoutAction } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { UserAvatar } from '@/components/ui/avatar'
import { InstallHint } from '@/components/install-hint'

export const metadata: Metadata = { title: 'Mehr' }

const GROUPS: { title: string; links: { href: string; label: string; icon: LucideIcon }[] }[] = [
  {
    title: 'Für euch',
    links: [
      { href: '/notfall', label: 'Notfallkarte', icon: Siren },
      { href: '/wissen', label: 'Wissen & Nachschlagen', icon: BookOpen },
      { href: '/tagebuch', label: 'Tagebuch & Erinnerungen', icon: BookHeart },
      { href: '/sounds', label: 'Einschlafgeräusche', icon: Music },
      { href: '/wachstum', label: 'Wachstum', icon: Ruler },
      { href: '/vorsorge', label: 'Impfungen & Untersuchungen', icon: Syringe },
      { href: '/zaehne', label: 'Zähne', icon: Smile },
      { href: '/gesundheit/fieber', label: 'Fieberverlauf', icon: Thermometer },
      { href: '/protokoll', label: 'Stillprotokoll für die Hebamme', icon: ClipboardList },
      { href: '/vorrat', label: 'Milchvorrat', icon: Milk },
      { href: '/auswertung', label: 'Auswertung', icon: LineChart },
      { href: '/entwicklung', label: 'Entwicklung & Übungen', icon: Sparkles },
    ],
  },
  {
    title: 'Einstellungen',
    links: [
      { href: '/mehr/kind', label: 'Kindprofil', icon: Baby },
      { href: '/mehr/notfall', label: 'Notfalldaten', icon: ShieldAlert },
      { href: '/mehr/einladung', label: 'Zweite Person einladen', icon: UserPlus },
      { href: '/mehr/benachrichtigungen', label: 'Benachrichtigungen', icon: BellRing },
      { href: '/mehr/anzeige', label: 'Was die App anzeigt', icon: SquareDashedBottom },
      { href: '/mehr/nachtmodus', label: 'Nachtmodus & Anzeige', icon: Moon },
      { href: '/mehr/darstellung', label: 'Einheiten & Startbildschirm', icon: SlidersHorizontal },
    ],
  },
  {
    title: 'Daten',
    links: [
      { href: '/mehr/export', label: 'Export', icon: Download },
      { href: '/mehr/daten', label: 'Backup & Daten', icon: HardDriveDownload },
      { href: '/mehr/integrationen', label: 'Automationen & API', icon: KeyRound },
    ],
  },
]

export default async function MorePage() {
  const ctx = await getAppContext()
  const features = await currentFeatures()
  // Abgeschaltete Bereiche stehen nicht als graue Zeile da, sondern gar nicht.
  // Ohne Auswertung gaebe es sonst keinen Weg mehr zu den offenen Verdachts-
  // faellen. Der Eintrag kommt nur, wenn wirklich etwas offen ist – und ohne
  // Zahl daneben.
  const duplikate = ctx.activeChild ? await offeneDuplikate(ctx.activeChild.id) : 0
  const groups = GROUPS.map((group) => ({
    ...group,
    links: group.links
      .filter((link) => routeErlaubt(features, link.href))
      .concat(
        group.title === 'Für euch' && duplikate > 0
          ? [{ href: '/duplikate', label: 'Doppelte Einträge', icon: CopyCheck }]
          : [],
      ),
  })).filter((group) => group.links.length > 0)

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

      {groups.map((group) => (
        <nav key={group.title} aria-label={group.title}>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
            {group.title}
          </h2>
          <ul className="flex flex-col gap-2">
            {group.links.map(({ href, label, icon: Icon }) => (
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
      ))}

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
