import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getAppContext } from '@/lib/household'
import { prisma } from '@/lib/db'
import { ensureMkpAppointments } from '@/lib/pregnancy/seed'
import { gestationalAge } from '@/lib/pregnancy/weeks'
import { BackLink } from '@/components/layout/back-link'
import { AppointmentList } from './appointment-list'

export const metadata: Metadata = { title: 'Termine' }

export default async function AppointmentsPage() {
  const ctx = await getAppContext()
  if (!ctx.pregnancy) redirect('/onboarding')

  // Beim ersten Aufruf werden die Mutter-Kind-Pass-Termine aus dem ET erzeugt.
  await ensureMkpAppointments(
    ctx.household.id,
    ctx.pregnancy.id,
    ctx.pregnancy.dueDate,
    ctx.user.id,
    ctx.timezone,
  )

  const appointments = await prisma.appointment.findMany({
    where: { householdId: ctx.household.id },
    orderBy: [{ windowFrom: 'asc' }, { scheduledAt: 'asc' }],
  })
  const age = gestationalAge(ctx.pregnancy.dueDate, new Date(), ctx.timezone)
  const dueDate = ctx.pregnancy.dueDate

  /**
   * SSW-Bereich eines Zeitfensters. Bewusst serverseitig – die
   * Wochenberechnung muss die Zeitzone kennen, sonst verschiebt eine
   * Zeitumstellung zwischen Fensterbeginn und Berechnung die Woche um eins.
   */
  function weekRange(from: Date | null, to: Date | null): string | null {
    if (!from || !to) return null
    const start = gestationalAge(dueDate, from, ctx.timezone).week
    // `to` ist exklusiv (Beginn der Folgewoche) – daher einen Tag zurueck.
    const end = gestationalAge(dueDate, new Date(to.getTime() - 86400000), ctx.timezone).week
    return `SSW ${start}–${end}`
  }

  return (
    <div className="flex flex-col gap-4">
      <BackLink href="/schwangerschaft" label="Schwangerschaft" />
      <h1 className="font-display text-2xl font-bold">Termine</h1>
      <p className="text-muted-foreground">
        Die Mutter-Kind-Pass-Untersuchungen sind mit ihrem üblichen Zeitfenster vorbelegt. Du bist
        gerade in SSW {age.label}.
      </p>
      <AppointmentList currentWeek={age.week}
        appointments={appointments.map((a) => ({
          id: a.id,
          title: a.title,
          category: a.category,
          scheduledAt: a.scheduledAt?.toISOString() ?? null,
          windowFrom: a.windowFrom?.toISOString() ?? null,
          windowTo: a.windowTo?.toISOString() ?? null,
          weekRange: weekRange(a.windowFrom, a.windowTo),
          location: a.location,
          note: a.note,
          done: a.done,
          templateKey: a.templateKey,
        }))}
      />
    </div>
  )
}
