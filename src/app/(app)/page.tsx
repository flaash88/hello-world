import Link from 'next/link'
import { Baby, ChevronRight, HeartHandshake, Timer, UserPlus } from 'lucide-react'
import { getAppContext } from '@/lib/household'
import { gestationalAge } from '@/lib/pregnancy/weeks'
import { pregnancyWeekContent } from '@/lib/pregnancy/content'
import { formatAge, formatDateLong } from '@/lib/time'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

export default async function HomePage() {
  const ctx = await getAppContext()
  const partnerMissing = ctx.members.length < 2

  const age = ctx.pregnancy
    ? gestationalAge(ctx.pregnancy.dueDate, new Date(), ctx.timezone)
    : null
  const weekContent = age ? pregnancyWeekContent(age.week) : null

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold">Hallo {ctx.user.displayName}!</h1>
        <p className="text-muted-foreground">{ctx.household.name}</p>
      </div>

      {!ctx.activeChild && !ctx.pregnancy && (
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

          <Button asChild size="lg" variant="outline" className="h-16">
            <Link href="/schwangerschaft/wehen">
              <Timer aria-hidden />
              Wehen-Timer öffnen
            </Link>
          </Button>
        </>
      )}

      {ctx.activeChild?.birthDate && (
        <Card>
          <CardHeader>
            <CardTitle>{ctx.activeChild.name}</CardTitle>
            <CardDescription>
              {formatAge(ctx.activeChild.birthDate, new Date(), ctx.timezone)} · geboren am{' '}
              {formatDateLong(ctx.activeChild.birthDate, ctx.timezone)}
            </CardDescription>
          </CardHeader>
        </Card>
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
