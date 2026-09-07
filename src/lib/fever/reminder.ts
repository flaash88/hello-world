import 'server-only'
import { prisma } from '@/lib/db'
import { formatTime } from '@/lib/time'

/**
 * Erinnerung an das selbst eingetragene Intervall.
 *
 * Das ist ausdruecklich keine Dosierungshilfe: die App uebernimmt die Stunden,
 * die beim Eintragen angegeben wurden, und meldet sich, wenn sie um sind. Sie
 * schlaegt keine Menge vor und prueft keine Hoechstmenge.
 *
 * Ob die Meldung ankommt, entscheidet die Einstellung „Medikamente" in den
 * Benachrichtigungen – ohne sie bleibt es still.
 */
export async function planeIntervallErinnerung(input: {
  householdId: string
  childId: string
  childName: string
  mittel: string
  gegebenAm: Date
  repeatHours: number
  timezone: string
}): Promise<void> {
  const dueAt = new Date(input.gegebenAm.getTime() + input.repeatHours * 3600_000)
  if (dueAt.getTime() <= Date.now()) return

  // Eine offene Erinnerung je Mittel und Kind reicht – die neueste gilt.
  await prisma.reminder.deleteMany({
    where: {
      childId: input.childId,
      kind: 'medication',
      sentAt: null,
      payload: { path: ['mittel'], equals: input.mittel },
    },
  })

  await prisma.reminder.create({
    data: {
      householdId: input.householdId,
      childId: input.childId,
      kind: 'medication',
      title: `${input.mittel} für ${input.childName} wäre wieder möglich`,
      dueAt,
      payload: {
        body: `Das eingetragene Intervall von ${input.repeatHours} Stunden ist um – frühestens ab ${formatTime(dueAt, input.timezone)}.`,
        url: '/gesundheit/fieber',
        mittel: input.mittel,
      },
    },
  })
}
