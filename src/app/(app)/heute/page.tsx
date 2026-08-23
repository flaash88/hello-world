import Link from 'next/link'
import {
  Baby,
  ChevronRight,
  ClipboardList,
  HeartHandshake,
  Plus,
  Thermometer,
  Timer,
  UserPlus,
} from 'lucide-react'
import { getAppContext } from '@/lib/household'
import { gestationalAge } from '@/lib/pregnancy/weeks'
import { pregnancyWeekContent } from '@/lib/pregnancy/content'
import { formatAge, formatDateLong } from '@/lib/time'
import {
  knownFoods,
  lastEventPerType,
  lastNursingSide,
  recentEvents,
} from '@/lib/events/queries'
import { unitPrefsFrom } from '@/lib/units'
import { laufendeFieberEpisode } from '@/lib/fever/current'
import { istNeugeborenes } from '@/lib/growth/newborn'
import { parseQuickActions } from '@/lib/settings/display'
import { GRUNDKATEGORIEN } from '@/lib/settings/features'
import { currentFeatures } from '@/lib/settings/features-server'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { analyseSleep, persistForecast } from '@/lib/sleep/analysis'
import { buildDayClockData } from '@/lib/actions/dashboard'
import { DayClockSection } from '@/components/dashboard/day-clock-section'
import { SleepForecastCard } from '@/components/dashboard/sleep-forecast-card'
import { SleepTodayCard } from '@/components/dashboard/sleep-today-card'
import { QuickActions } from '@/components/tracker/quick-actions'
import { LastEventsStrip } from '@/components/tracker/last-events-strip'
import { EventList } from '@/components/tracker/event-list'
import { AllActionsSheet } from '@/components/tracker/all-actions-sheet'
import { NachtragSheet } from '@/components/tracker/nachtrag-sheet'

export default async function HomePage() {
  const ctx = await getAppContext()
  const features = await currentFeatures()
  const units = unitPrefsFrom(ctx.household.settings)
  // Abgeschaltete Bereiche werden nicht ausgeblendet, sondern gar nicht erst
  // gerechnet: die Schlafanalyse laeuft dann ueberhaupt nicht.
  const zeigeSchlaf = features.aktiv.has('schlafanalyse')
  const zeigeKreisuhr = features.aktiv.has('kreisuhr')
  const partnerMissing = ctx.members.length < 2
  const child = ctx.activeChild

  const age = ctx.pregnancy ? gestationalAge(ctx.pregnancy.dueDate, new Date(), ctx.timezone) : null
  const weekContent = age ? pregnancyWeekContent(age.week) : null

  const [events, lastByType, foods, nursingSide, analysis, clock] = child
    ? await Promise.all([
        recentEvents(child.id, ctx.members, 12),
        lastEventPerType(child.id),
        knownFoods(child.id),
        lastNursingSide(child.id),
        zeigeSchlaf ? analyseSleep(child, ctx.timezone) : Promise.resolve(null),
        zeigeKreisuhr
          ? buildDayClockData(child.id, ctx.timezone, 0, new Date(), units, zeigeSchlaf)
          : Promise.resolve(null),
      ])
    : ([
        [] as Awaited<ReturnType<typeof recentEvents>>,
        new Map(),
        [] as string[],
        null,
        null,
        null,
      ] as const)

  // Die aktuelle Vorhersage festhalten – daraus entsteht die Push-Erinnerung.
  if (child && analysis) {
    await persistForecast(child.id, analysis.forecast, analysis.model)
  }

  // Laeuft gerade eine Fieberepisode, gehoert sie nach oben – dann sucht
  // niemand nachts im Menue danach.
  const fieber = child ? await laufendeFieberEpisode(child.id) : null

  // In den ersten sechs Wochen ist das Protokoll fuer die Hebamme das, was am
  // haeufigsten gebraucht wird – danach verschwindet die Karte wieder.
  const wochenbett = istNeugeborenes(child?.birthDate ?? null, new Date(), ctx.timezone)

  // Waehrend einer Pause bleiben nur die vier Grundkategorien stehen.
  const quickActions = features.pausiert
    ? GRUNDKATEGORIEN
    : parseQuickActions(ctx.household.settings?.quickActions)
  const runningTypes = events.filter((e) => e.running).map((e) => e.type)

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold">Hallo {ctx.user.displayName}!</h1>
        <p className="text-muted-foreground">{ctx.household.name}</p>
      </div>

      {!child && !ctx.pregnancy && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Baby className="size-5 text-primary" aria-hidden />
              Los geht&apos;s
            </CardTitle>
            <CardDescription>
              Legt zuerst eure Schwangerschaft oder euer Kind an – danach steht der Rest der App
              bereit.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild size="lg" className="w-full">
              <Link href="/onboarding">Einrichtung starten</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {child && (
        <>
          {analysis && <SleepForecastCard analysis={analysis} timezone={ctx.timezone} />}

          <QuickActions
            childId={child.id}
            actions={quickActions}
            runningTypes={runningTypes}
            suggestions={foods}
            lastNursingSide={nursingSide}
          />
          <AllActionsSheet
            childId={child.id}
            active={quickActions}
            suggestions={foods}
            lastNursingSide={nursingSide}
          />
          <NachtragSheet childId={child.id} timezone={ctx.timezone} />

          {clock && (
            <section>
              <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
                Der Tag im Kreis
              </h2>
              <DayClockSection
                childId={child.id}
                initialSegments={clock.segments}
                initialPlanned={clock.planned}
                initialNowMinutes={clock.nowMinutes}
                initialLabel={clock.label}
              />
            </section>
          )}

          {wochenbett && (
            <Link href="/protokoll" className="block">
              <Card className="transition-colors hover:border-primary">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <ClipboardList className="size-4 text-primary" aria-hidden />
                      Stillprotokoll
                    </CardTitle>
                    <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
                  </div>
                  <CardDescription>
                    Die letzten Tage auf einen Blick – für den Besuch der Hebamme.
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          )}

          {fieber && (
            <Link href="/gesundheit/fieber" className="block">
              <Card className="transition-colors hover:border-primary">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Thermometer className="size-4 text-primary" aria-hidden />
                      Fieberverlauf
                    </CardTitle>
                    <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
                  </div>
                  <CardDescription>{fieber.zusammenfassung}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          )}

          {analysis && <SleepTodayCard analysis={analysis} />}

          <section>
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
              Zuletzt
            </h2>
            <LastEventsStrip
              units={units}
              lastByType={lastByType}
              types={['sleep', 'nursing', 'bottle', 'pumping', 'solids', 'diaper']}
            />
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                Heute
              </h2>
              <Link
                href="/verlauf"
                className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-primary"
              >
                Ganzer Verlauf
                <ChevronRight className="size-4" aria-hidden />
              </Link>
            </div>
            <EventList
              events={events}
              childId={child.id}
              suggestions={foods}
              showDayHeadings={false}
              emptyHint="Für heute noch nichts eingetragen."
            />
          </section>
        </>
      )}

      {ctx.pregnancy && age && (
        <>
          <Link href="/schwangerschaft" className="block">
            <Card className="transition-colors hover:border-primary">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="flex items-center gap-2">
                    <HeartHandshake className="size-5 text-primary" aria-hidden />
                    {ctx.pregnancy.label}
                  </CardTitle>
                  <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
                </div>
                <CardDescription>
                  ET am {formatDateLong(ctx.pregnancy.dueDate, ctx.timezone)}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="flex items-baseline justify-between">
                  <span className="font-display text-3xl font-bold tabular">SSW {age.label}</span>
                  <Badge variant="secondary">
                    {age.overdue
                      ? `${Math.abs(age.daysToDue)} Tage drüber`
                      : `noch ${age.daysToDue} Tage`}
                  </Badge>
                </div>
                <Progress
                  value={Math.round(age.progress * 100)}
                  aria-label={`${Math.round(age.progress * 100)} Prozent der Schwangerschaft`}
                />
                {weekContent && (
                  <p className="text-sm text-muted-foreground">
                    Etwa so groß wie {weekContent.comparison.toLowerCase()}.
                  </p>
                )}
              </CardContent>
            </Card>
          </Link>

          {!child && (
            <>
              <Button asChild size="lg" variant="outline" className="h-16">
                <Link href="/schwangerschaft/wehen">
                  <Timer aria-hidden />
                  Wehen-Timer öffnen
                </Link>
              </Button>
              <Button asChild variant="ghost">
                <Link href="/onboarding">
                  <Plus aria-hidden />
                  Kind ist da – Profil anlegen
                </Link>
              </Button>
            </>
          )}
        </>
      )}

      {child?.birthDate && (
        <p className="text-center text-xs text-muted-foreground">
          {child.name} · {formatAge(child.birthDate, new Date(), ctx.timezone)}
        </p>
      )}

      {partnerMissing && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="size-5 text-primary" aria-hidden />
              Zweite Person einladen
            </CardTitle>
            <CardDescription>
              Erstelle einen Einladungscode, damit ihr beide alles seht und eintragen könnt.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/mehr/einladung">Einladungscode erstellen</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
