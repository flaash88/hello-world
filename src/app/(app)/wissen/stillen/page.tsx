import type { Metadata } from 'next'
import { Phone, Snowflake, TriangleAlert } from 'lucide-react'
import { BF_BASICS, BF_HELP_NOTE, BF_PROBLEMS, MILK_STORAGE } from '@/lib/content/breastfeeding'
import { BackLink } from '@/components/layout/back-link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MedicalDisclaimer } from '@/components/medical-disclaimer'

export const metadata: Metadata = { title: 'Stillen' }

export default function BreastfeedingPage() {
  return (
    <div className="flex flex-col gap-4">
      <BackLink href="/wissen" label="Wissen" />
      <h1 className="font-display text-2xl font-bold">Stillen</h1>
      <p className="text-muted-foreground">
        Stillen ist erlernbar und am Anfang fast immer anstrengend. Hier steht, was normal ist,
        woran man ein Problem erkennt – und wann man Hilfe holt statt auszuhalten.
      </p>

      <section className="flex flex-col gap-2">
        {BF_BASICS.map((section) => (
          <Card key={section.key}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{section.title}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <p className="text-sm leading-relaxed">{section.body}</p>
              {section.points && (
                <ul className="flex flex-col gap-1.5 pl-4 text-sm leading-relaxed">
                  {section.points.map((point) => (
                    <li key={point} className="list-disc marker:text-primary">
                      {point}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ))}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
          Wenn es Probleme gibt
        </h2>
        <ul className="flex flex-col gap-2">
          {BF_PROBLEMS.map((problem) => (
            <li key={problem.key}>
              <Card>
                <CardContent className="flex flex-col gap-2 p-4">
                  <h3 className="font-display text-lg font-semibold">{problem.title}</h3>
                  <p className="text-sm leading-relaxed">
                    <span className="font-semibold">Woran du es merkst: </span>
                    {problem.signs}
                  </p>
                  <ul className="flex flex-col gap-1.5 pl-4 text-sm leading-relaxed">
                    {problem.help.map((entry) => (
                      <li key={entry} className="list-disc marker:text-primary">
                        {entry}
                      </li>
                    ))}
                  </ul>
                  {problem.callFor && (
                    <p className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                      <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                      <span>{problem.callFor}</span>
                    </p>
                  )}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Snowflake className="size-4 text-muted-foreground" aria-hidden />
            Abgepumpte Milch aufbewahren
          </CardTitle>
          <CardDescription>
            Nach der CDC-Leitlinie. Immer mit Datum beschriften – im Halbschlaf erkennt niemand,
            welches Fläschchen älter ist.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col divide-y divide-border">
            {MILK_STORAGE.map((entry) => (
              <li key={entry.place} className="flex flex-col gap-0.5 py-2 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-semibold">{entry.place}</span>
                  <span className="tabular text-sm text-primary">{entry.duration}</span>
                </div>
                {entry.note && <p className="text-sm text-muted-foreground">{entry.note}</p>}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-start gap-2 p-4">
          <Phone className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <p className="text-sm leading-relaxed">{BF_HELP_NOTE}</p>
        </CardContent>
      </Card>

      <MedicalDisclaimer>
        Diese Seite ersetzt keine Stillberatung. Bei Fieber, starken Schmerzen oder wenn dein Kind
        nicht zunimmt, gehört das noch am selben Tag zur Hebamme oder Ärztin.
      </MedicalDisclaimer>
    </div>
  )
}
