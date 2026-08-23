import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  Activity,
  Baby,
  CalendarCheck,
  ChevronRight,
  Footprints,
  Heart,
  Luggage,
  Timer,
} from 'lucide-react'
import { getAppContext } from '@/lib/household'
import { gestationalAge, TRIMESTERS } from '@/lib/pregnancy/weeks'
import { pregnancyWeekContent } from '@/lib/pregnancy/content'
import { formatDateLong } from '@/lib/time'
import { formatLength, formatMass, unitPrefsFrom } from '@/lib/units'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CountdownRing } from '@/components/pregnancy/countdown-ring'
import { MedicalDisclaimer } from '@/components/medical-disclaimer'

export const metadata: Metadata = { title: 'Schwangerschaft' }

const TOOLS = [
  { href: '/schwangerschaft/wehen', label: 'Wehen-Timer', icon: Timer },
  { href: '/schwangerschaft/bewegungen', label: 'Kindsbewegungen zählen', icon: Footprints },
  { href: '/schwangerschaft/werte', label: 'Gewicht, Blutdruck, Symptome', icon: Activity },
  { href: '/schwangerschaft/termine', label: 'Termine & Mutter-Kind-Pass', icon: CalendarCheck },
  { href: '/schwangerschaft/kliniktasche', label: 'Kliniktasche', icon: Luggage },
  { href: '/schwangerschaft/namen', label: 'Namensliste', icon: Heart },
]

export default async function PregnancyPage() {
  const ctx = await getAppContext()
  const units = unitPrefsFrom(ctx.household.settings)
  if (!ctx.pregnancy) redirect('/onboarding')

  const age = gestationalAge(ctx.pregnancy.dueDate, new Date(), ctx.timezone)
  const content = pregnancyWeekContent(age.week)
  const trimester = TRIMESTERS.find((t) => t.number === age.trimester)!

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold">{ctx.pregnancy.label}</h1>
        <p className="text-muted-foreground">
          Errechneter Termin: {formatDateLong(ctx.pregnancy.dueDate, ctx.timezone)}
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center gap-4 pt-6">
          <CountdownRing age={age} />
          <div className="flex flex-wrap justify-center gap-2">
            <Badge>{trimester.label}</Badge>
            <Badge variant="secondary">
              {age.overdue
                ? `${Math.abs(age.daysToDue)} Tage über dem Termin`
                : age.daysToDue === 0
                  ? 'Heute ist der Termin'
                  : `noch ${age.daysToDue} Tage`}
            </Badge>
          </div>
          {content && (
            <p className="text-center text-sm text-muted-foreground">
              Euer Baby ist etwa so groß wie {articleFor(content.comparison)}{' '}
              <strong className="text-foreground">{content.comparison}</strong>
              {content.lengthCm !== null && ` – rund ${formatLength(content.lengthCm, units)}`}
              {content.weightG !== null && ` und ${formatMass(content.weightG, units)} schwer`}.
            </p>
          )}
        </CardContent>
      </Card>

      {content ? (
        <Card>
          <CardHeader>
            <CardTitle>Diese Woche</CardTitle>
            <CardDescription>SSW {age.week}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <section>
              <h3 className="mb-1 text-sm font-bold uppercase tracking-wide text-muted-foreground">
                Beim Baby
              </h3>
              <p className="text-sm leading-relaxed">{content.development}</p>
            </section>
            <section>
              <h3 className="mb-1 text-sm font-bold uppercase tracking-wide text-muted-foreground">
                Bei Mama
              </h3>
              <p className="text-sm leading-relaxed">{content.mother}</p>
            </section>
            <section className="rounded-xl bg-accent p-3">
              <h3 className="mb-1 text-sm font-bold uppercase tracking-wide text-accent-foreground">
                Für den Partner
              </h3>
              <p className="text-sm leading-relaxed">{content.partnerTip}</p>
            </section>
            <Link
              href="/schwangerschaft/woche"
              className="inline-flex min-h-12 items-center gap-1 text-sm font-semibold text-primary"
            >
              Alle Wochen ansehen
              <ChevronRight className="size-4" aria-hidden />
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Baby className="size-5 text-primary" aria-hidden />
              Noch sehr früh
            </CardTitle>
            <CardDescription>
              Die Woche-für-Woche-Inhalte beginnen mit SSW 4. Bis dahin gibt es wenig zu berichten
              – das ändert sich schnell.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <nav aria-label="Werkzeuge">
        <ul className="flex flex-col gap-2">
          {TOOLS.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className="flex min-h-14 items-center gap-3 rounded-xl border border-border bg-card px-4 font-semibold"
              >
                <Icon className="size-5 text-primary" aria-hidden />
                <span className="flex-1">{label}</span>
                <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <MedicalDisclaimer>
        Alle Angaben sind Durchschnittswerte zur Orientierung. Gesunde Kinder entwickeln sich
        unterschiedlich schnell – maßgeblich ist, was eure Hebamme und eure Ärztin sagen.
      </MedicalDisclaimer>
    </div>
  )
}

function articleFor(word: string): string {
  // Grobe, aber ausreichende Heuristik fuer die Vergleichsobjekte in content.ts.
  const feminine = /e$|ne$|ise$|elone$|beere$|traube$|nuss$|zwetschke$/i
  const neuter = /korn$|samen$|kraut$|blatt$/i
  if (neuter.test(word)) return 'ein'
  if (feminine.test(word)) return 'eine'
  return 'ein'
}

