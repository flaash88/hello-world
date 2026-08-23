import type { Metadata } from 'next'
import Link from 'next/link'
import { HeartHandshake, TriangleAlert } from 'lucide-react'
import {
  PP_BODY,
  PP_MOOD,
  PP_PHASES,
  PP_RED_FLAGS,
  PP_RED_FLAG_NOTE,
  type PpSection,
} from '@/lib/content/postpartum'
import { BackLink } from '@/components/layout/back-link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MedicalDisclaimer } from '@/components/medical-disclaimer'

export const metadata: Metadata = { title: 'Wochenbett' }

export default function PostpartumPage() {
  return (
    <div className="flex flex-col gap-4">
      <BackLink href="/wissen" label="Wissen" />
      <h1 className="font-display text-2xl font-bold">Wochenbett</h1>
      <p className="text-muted-foreground">
        Sechs bis acht Wochen, in denen ein Körper heilt und ein Mensch ankommt. Kein Urlaub, keine
        Krankheit – eine Zeit mit eigenen Regeln.
      </p>

      <Card className="border-destructive/40">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-destructive">
            <TriangleAlert className="size-4" aria-hidden />
            Sofort anrufen bei
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <ul className="flex flex-col gap-1.5 pl-4 text-sm leading-relaxed">
            {PP_RED_FLAGS.map((flag) => (
              <li key={flag} className="list-disc marker:text-destructive">
                {flag}
              </li>
            ))}
          </ul>
          <p className="text-sm font-semibold">{PP_RED_FLAG_NOTE}</p>
        </CardContent>
      </Card>

      <Group title="Wie die Wochen verlaufen" sections={PP_PHASES} />
      <Group title="Was der Körper macht" sections={PP_BODY} />

      <section>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
          Wie es euch dabei geht
        </h2>
        <ul className="flex flex-col gap-2">
          {PP_MOOD.map((entry) => (
            <li key={entry.key}>
              <Card>
                <CardContent className="flex flex-col gap-2 p-4">
                  <h3 className="font-display text-lg font-semibold">{entry.title}</h3>
                  <p className="text-sm leading-relaxed">{entry.body}</p>
                  <ul className="flex flex-col gap-1.5 pl-4 text-sm leading-relaxed">
                    {entry.points.map((point) => (
                      <li key={point} className="list-disc marker:text-primary">
                        {point}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <Link
        href="/eltern"
        className="flex min-h-14 items-center justify-center gap-2 rounded-xl border-2 border-border px-4 font-semibold"
      >
        <HeartHandshake className="size-5" aria-hidden />
        Zum Eltern-Bereich
      </Link>

      <MedicalDisclaimer>
        In Österreich kommt die Hebamme im Wochenbett zu euch nach Hause – das ist der beste Ort für
        alle Fragen, auch die, die man nicht googeln mag. Diese Seite ersetzt weder die Nachsorge
        noch die Kontrolluntersuchung.
      </MedicalDisclaimer>
    </div>
  )
}

function Group({ title, sections }: { title: string; sections: PpSection[] }) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      <ul className="flex flex-col gap-2">
        {sections.map((section) => (
          <li key={section.key}>
            <Card>
              <CardContent className="flex flex-col gap-2 p-4">
                <h3 className="font-semibold">{section.title}</h3>
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
          </li>
        ))}
      </ul>
    </section>
  )
}
