import type { Metadata } from 'next'
import { CalendarClock, Info } from 'lucide-react'
import { getAppContext } from '@/lib/household'
import { gestationalAge } from '@/lib/pregnancy/weeks'
import { PREP_SECTIONS, PREP_TASKS, PREP_EXERCISES } from '@/lib/content/birth-prep'
import { BackLink } from '@/components/layout/back-link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MedicalDisclaimer } from '@/components/medical-disclaimer'

export const metadata: Metadata = { title: 'Geburtsvorbereitung' }

export default async function BirthPrepPage() {
  const ctx = await getAppContext()
  const age = ctx.pregnancy ? gestationalAge(ctx.pregnancy.dueDate, new Date(), ctx.timezone) : null
  const week = age?.week ?? null

  // Ohne laufende Schwangerschaft zeigen wir alles; mit Schwangerschaft ist
  // oben, was jetzt dran ist, und darunter, was noch kommt.
  const due = week === null ? PREP_TASKS : PREP_TASKS.filter((task) => week >= task.fromWeek)
  const later = week === null ? [] : PREP_TASKS.filter((task) => week < task.fromWeek)
  const exercises = week === null ? PREP_EXERCISES : PREP_EXERCISES.filter((e) => week >= e.fromWeek)

  return (
    <div className="flex flex-col gap-4">
      <BackLink href="/wissen" label="Wissen" />
      <div>
        <h1 className="font-display text-2xl font-bold">Geburtsvorbereitung</h1>
        {week !== null && <p className="text-muted-foreground">Stand: SSW {week}</p>}
      </div>

      <p className="text-muted-foreground">
        Das meiste davon beginnt zwischen der 34. und 36. Woche. Vorher ist nichts davon dringend –
        und keine Liste der Welt macht eine Geburt planbar.
      </p>

      {PREP_SECTIONS.map((section) => {
        const tasks = due.filter((task) => task.section === section)
        if (tasks.length === 0) return null
        return (
          <section key={section}>
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
              {section}
            </h2>
            <ul className="flex flex-col gap-2">
              {tasks.map((task) => (
                <li key={task.key}>
                  <Card>
                    <CardContent className="flex flex-col gap-1.5 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{task.label}</h3>
                        <Badge variant="secondary" className="gap-1">
                          <CalendarClock className="size-3" aria-hidden />
                          {task.timing}
                        </Badge>
                      </div>
                      {task.note && (
                        <p className="text-sm leading-relaxed text-muted-foreground">{task.note}</p>
                      )}
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          </section>
        )
      })}

      {later.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Info className="size-4 text-muted-foreground" aria-hidden />
              Kommt später
            </CardTitle>
            <CardDescription>Damit ihr wisst, was noch ansteht – jetzt aber nicht.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-1.5 text-sm text-muted-foreground">
              {later.map((task) => (
                <li key={task.key} className="flex justify-between gap-3">
                  <span>{task.label}</span>
                  <span className="shrink-0 tabular">ab SSW {task.fromWeek}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <section>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
          Übungen
        </h2>
        <p className="mb-2 text-sm text-muted-foreground">
          Zehn Minuten am Tag reichen. Es geht um Beweglichkeit im Becken und darum, bewusst
          loslassen zu können – nicht um Kraft.
        </p>
        <ul className="flex flex-col gap-2">
          {exercises.map((exercise) => (
            <li key={exercise.key}>
              <Card>
                <CardContent className="flex flex-col gap-2 p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="font-display text-lg font-semibold">{exercise.title}</h3>
                    <Badge variant="outline">{exercise.durationLabel}</Badge>
                  </div>
                  <p className="text-sm">
                    <span className="font-semibold">Ziel: </span>
                    {exercise.goal}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold">Material: </span>
                    {exercise.material}
                  </p>
                  <ol className="flex flex-col gap-1.5 pl-5 text-sm leading-relaxed">
                    {exercise.steps.map((step, index) => (
                      <li key={index} className="list-decimal">
                        {step}
                      </li>
                    ))}
                  </ol>
                  {exercise.note && (
                    <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
                      {exercise.note}
                    </p>
                  )}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <MedicalDisclaimer>
        Übungen und Maßnahmen sind allgemein gehalten. Bei vorzeitigen Wehen, tiefliegender
        Plazenta, Beckenendlage, Mehrlingen oder einem Muttermund, der schon arbeitet, gilt etwas
        anderes – sprich vorher mit deiner Hebamme oder Ärztin.
      </MedicalDisclaimer>
    </div>
  )
}
