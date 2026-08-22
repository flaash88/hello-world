/**
 * Setzt die Testdatenbank auf einen frischen Stand zurueck: leert alle Tabellen
 * und legt Haushalt plus Bootstrap-Einladungscode neu an.
 * Wird von `globalSetup` in playwright.config.ts aufgerufen.
 */
import { PrismaClient } from '@prisma/client'
import { createHash } from 'node:crypto'

export default async function globalSetup(): Promise<void> {
  const prisma = new PrismaClient()
  try {
    await prisma.$executeRawUnsafe(`
      TRUNCATE TABLE
        "EventRevision", "Event", "GrowthMeasurement", "Milestone", "ExerciseLog",
        "MediaAsset", "JournalEntry", "MoodLog", "ParentSleepLog",
        "ParentJournalEntry", "NightShift", "Reminder", "SleepPrediction",
        "PushSubscription", "NotificationPreference", "NameVote",
        "NameSuggestion", "ChecklistItem", "Appointment", "MaternalLog",
        "KickSession", "Contraction", "Pregnancy", "Child", "Session",
        "LoginAttempt", "Invite", "User", "HouseholdSettings", "Household"
      RESTART IDENTITY CASCADE
    `)

    const household = await prisma.household.create({
      data: { name: 'Testfamilie', timezone: 'Europe/Vienna', settings: { create: {} } },
    })
    const code = process.env.E2E_INVITE_CODE ?? 'WILLKOMMEN'
    await prisma.invite.create({
      data: {
        householdId: household.id,
        codeHash: createHash('sha256')
          .update(`${process.env.SESSION_SECRET ?? ''}:${code}`)
          .digest('hex'),
        label: 'E2E',
        expiresAt: new Date(Date.now() + 86400000),
      },
    })
    console.log('[e2e] Datenbank zurückgesetzt.')
  } finally {
    await prisma.$disconnect()
  }
}
