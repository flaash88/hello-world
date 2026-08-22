import Link from 'next/link'
import { Baby, HeartHandshake, UserPlus } from 'lucide-react'
import { getAppContext } from '@/lib/household'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatAge, formatDateLong } from '@/lib/time'

export default async function HomePage() {
  const ctx = await getAppContext()
  const partnerMissing = ctx.members.length < 2

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
              Lege zuerst eure Schwangerschaft oder euer Kind an – danach steht der Rest der App
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

      {ctx.pregnancy && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HeartHandshake className="size-5 text-primary" aria-hidden />
              {ctx.pregnancy.label}
            </CardTitle>
            <CardDescription>
              Errechneter Termin: {formatDateLong(ctx.pregnancy.dueDate, ctx.timezone)}
            </CardDescription>
          </CardHeader>
        </Card>
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
