import 'server-only'
import { prisma } from '@/lib/db'

export const BACKUP_FORMAT_VERSION = 1

/**
 * Vollstaendiges JSON-Backup eines Haushalts.
 *
 * Enthalten ist alles, was zum Wiederherstellen gebraucht wird – ohne
 * Passwort-Hashes, Sessions und Einladungscodes. Die sollen bei einem Export,
 * der auch mal in einer Cloud landet, nicht mitreisen; beim Restore werden die
 * Konten neu angelegt.
 *
 * Das private Elterntagebuch ist ebenfalls nicht enthalten, ausser der
 * anfragende User exportiert seine eigenen Eintraege (`includeOwnPrivate`).
 */
export async function buildBackup(
  householdId: string,
  options: { includeOwnPrivate?: string } = {},
) {
  const [household, users, children, pregnancies, events, measurements, milestones, journal, media, moods, parentSleep, nightShifts, reminders, exerciseLogs, customSounds] =
    await Promise.all([
      prisma.household.findUniqueOrThrow({ where: { id: householdId }, include: { settings: true } }),
      prisma.user.findMany({
        where: { householdId },
        select: {
          id: true,
          email: true,
          displayName: true,
          initials: true,
          color: true,
          role: true,
          createdAt: true,
          notificationPrefs: true,
        },
      }),
      prisma.child.findMany({ where: { householdId } }),
      prisma.pregnancy.findMany({
        where: { householdId },
        include: {
          contractions: true,
          kickSessions: true,
          maternalLogs: true,
          appointments: true,
          checklistItems: true,
          nameSuggestions: { include: { votes: true } },
        },
      }),
      prisma.event.findMany({ where: { child: { householdId } }, orderBy: { startedAt: 'asc' } }),
      prisma.growthMeasurement.findMany({ where: { child: { householdId } }, orderBy: { measuredAt: 'asc' } }),
      prisma.milestone.findMany({ where: { child: { householdId } } }),
      prisma.journalEntry.findMany({ where: { child: { householdId } }, orderBy: { happenedAt: 'asc' } }),
      prisma.mediaAsset.findMany({ where: { child: { householdId } } }),
      prisma.moodLog.findMany({ where: { user: { householdId } } }),
      prisma.parentSleepLog.findMany({ where: { user: { householdId } } }),
      prisma.nightShift.findMany({ where: { householdId } }),
      prisma.reminder.findMany({ where: { householdId, doneAt: null } }),
      prisma.exerciseLog.findMany({ where: { child: { householdId } } }),
      // Die Audiodateien selbst liegen im Upload-Volume; hier steht nur, welche
      // es gab – sonst waere das Backup je nach Sammlung hundert Megabyte gross.
      prisma.customSound.findMany({ where: { householdId } }),
    ])

  const [vorsorge, teeth, milkPortions, audioNotes, emergencyContacts] = await Promise.all([
    prisma.vorsorgeEntry.findMany({ where: { child: { householdId } }, orderBy: { doneAt: 'asc' } }),
    prisma.tooth.findMany({ where: { child: { householdId } } }),
    prisma.milkPortion.findMany({ where: { householdId }, orderBy: { abgepumptAm: 'asc' } }),
    // Wie bei den Klaengen: die Tondateien liegen im Upload-Volume, hier steht
    // nur, welche es gab – sonst waere das Backup schnell dreistellig gross.
    prisma.audioNote.findMany({ where: { child: { householdId } }, orderBy: { recordedAt: 'asc' } }),
    prisma.emergencyContact.findMany({ where: { householdId }, orderBy: { sortOrder: 'asc' } }),
  ])

  const privateJournal = options.includeOwnPrivate
    ? await prisma.parentJournalEntry.findMany({ where: { userId: options.includeOwnPrivate } })
    : []

  return {
    format: 'sproessling-backup',
    version: BACKUP_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    note: 'Passwörter, Sitzungen und Einladungscodes sind bewusst nicht enthalten.',
    household,
    users,
    children,
    pregnancies,
    events,
    measurements,
    milestones,
    journal,
    media,
    moods,
    parentSleep,
    nightShifts,
    reminders,
    exerciseLogs,
    customSounds,
    vorsorge,
    teeth,
    milkPortions,
    audioNotes,
    emergencyContacts,
    privateJournal,
  }
}

export type Backup = Awaited<ReturnType<typeof buildBackup>>
