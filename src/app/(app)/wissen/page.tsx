import type { Metadata } from 'next'
import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import {
  Apple,
  Baby,
  ChevronRight,
  ClipboardList,
  CookingPot,
  Milk,
  ScanSearch,
  Sparkles,
} from 'lucide-react'
import { getAppContext } from '@/lib/household'
import { gestationalAge } from '@/lib/pregnancy/weeks'
import { trimesterForWeek, TRIMESTER_LABEL } from '@/lib/content/nutrition'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export const metadata: Metadata = { title: 'Wissen' }

type Entry = { href: string; label: string; description: string; icon: LucideIcon }

const PREGNANCY: Entry[] = [
  {
    href: '/wissen/ernaehrung',
    label: 'Ernährung',
    description: 'Welche Nährstoffe in welchem Drittel zählen – und woher ihr sie bekommt.',
    icon: Apple,
  },
  {
    href: '/wissen/lebensmittel',
    label: 'Darf ich das essen?',
    description: 'Nachschlagen statt googeln: über 50 Lebensmittel mit Einordnung und Zubereitungstipp.',
    icon: ScanSearch,
  },
  {
    href: '/wissen/geburtsvorbereitung',
    label: 'Geburtsvorbereitung',
    description: 'Was ab der 34. Woche ansteht, plus Übungen fürs Becken und zum Loslassen.',
    icon: Sparkles,
  },
]

const AFTER: Entry[] = [
  {
    href: '/wissen/stillen',
    label: 'Stillen',
    description: 'Anlegen, Positionen, wie oft ist normal – und was bei Milchstau zu tun ist.',
    icon: Milk,
  },
  {
    href: '/wissen/wochenbett',
    label: 'Wochenbett',
    description: 'Die ersten acht Wochen: was heilt, was normal ist, wo die Grenze zum Arztbesuch liegt.',
    icon: Baby,
  },
  {
    href: '/wissen/rezepte',
    label: 'Rezepte fürs Wochenbett',
    description: 'Fünfzehn Rezepte in höchstens 15 Minuten – die meisten mit einer Hand essbar.',
    icon: CookingPot,
  },
]

const ADMIN: Entry[] = [
  {
    href: '/wissen/behoerdenwege',
    label: 'Behördenwege in Österreich',
    description: 'Meldepflichten und Fristen vor und nach der Geburt, zum Abhaken.',
    icon: ClipboardList,
  },
]

export default async function WissenPage() {
  const ctx = await getAppContext()
  const age = ctx.pregnancy ? gestationalAge(ctx.pregnancy.dueDate, new Date(), ctx.timezone) : null
  const trimester = age ? trimesterForWeek(age.week) : null

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-2xl font-bold">Wissen</h1>
        <p className="text-muted-foreground">
          Nachschlagen statt suchen. Alles hier liegt auf eurem Server – auch ohne Internet.
        </p>
      </div>

      {age && trimester && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex flex-wrap items-center gap-2 text-base">
              Gerade dran
              <Badge variant="secondary">
                SSW {age.week} · {TRIMESTER_LABEL[trimester]}
              </Badge>
            </CardTitle>
            <CardDescription>Passend zu eurer Woche zuerst.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Link
              href="/wissen/ernaehrung"
              className="flex min-h-14 items-center gap-3 rounded-xl border-2 border-primary bg-primary/5 px-4 font-semibold"
            >
              <Apple className="size-5 text-primary" aria-hidden />
              <span className="flex-1">Ernährung im {TRIMESTER_LABEL[trimester]}</span>
              <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
            </Link>
            {age.week >= 34 && (
              <Link
                href="/wissen/geburtsvorbereitung"
                className="flex min-h-14 items-center gap-3 rounded-xl border-2 border-primary bg-primary/5 px-4 font-semibold"
              >
                <Sparkles className="size-5 text-primary" aria-hidden />
                <span className="flex-1">Geburtsvorbereitung ab SSW 34</span>
                <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      <Section title="In der Schwangerschaft" entries={PREGNANCY} />
      <Section title="Nach der Geburt" entries={AFTER} />
      <Section title="Papierkram" entries={ADMIN} />

      <p className="pb-2 text-xs text-muted-foreground">
        Alle Texte sind selbst geschrieben, die fachlichen Angaben stammen aus offen zugänglichen
        Quellen (AGES, Gesundheitsportal des Bundes, oesterreich.gv.at, Arbeiterkammer, ÖGK). Sie
        ersetzen weder Hebamme noch Ärztin.
      </p>
    </div>
  )
}

function Section({ title, entries }: { title: string; entries: Entry[] }) {
  return (
    <nav aria-label={title}>
      <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      <ul className="flex flex-col gap-2">
        {entries.map(({ href, label, description, icon: Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className="flex items-start gap-3 rounded-xl border border-border bg-card p-4"
            >
              <Icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{label}</span>
                <span className="block text-sm text-muted-foreground">{description}</span>
              </span>
              <ChevronRight className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
