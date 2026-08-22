-- CreateTable
CREATE TABLE "Household" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Vienna',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Household_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HouseholdSettings" (
    "householdId" TEXT NOT NULL,
    "nightModeStart" TEXT NOT NULL DEFAULT '20:00',
    "nightModeEnd" TEXT NOT NULL DEFAULT '06:00',
    "nightModeAuto" BOOLEAN NOT NULL DEFAULT true,
    "ntfyServerUrl" TEXT,
    "ntfyTopic" TEXT,
    "unitWeight" TEXT NOT NULL DEFAULT 'kg',
    "unitLength" TEXT NOT NULL DEFAULT 'cm',
    "unitTemp" TEXT NOT NULL DEFAULT 'c',
    "unitVolume" TEXT NOT NULL DEFAULT 'ml',
    "quickActions" JSONB NOT NULL DEFAULT '["sleep","nursing","bottle","diaper"]',
    "startScreen" TEXT NOT NULL DEFAULT 'dashboard',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HouseholdSettings_pkey" PRIMARY KEY ("householdId")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "initials" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#C0563A',
    "role" TEXT NOT NULL DEFAULT 'parent',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invite" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "label" TEXT,
    "createdById" TEXT,
    "usedAt" TIMESTAMP(3),
    "usedByEmail" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginAttempt" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Child" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "sex" TEXT NOT NULL DEFAULT 'unknown',
    "avatarPath" TEXT,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Child_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pregnancy" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "childId" TEXT,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "lastPeriod" TIMESTAMP(3),
    "label" TEXT NOT NULL DEFAULT 'Unser Baby',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pregnancy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contraction" (
    "id" TEXT NOT NULL,
    "pregnancyId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "intensity" INTEGER,
    "note" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Contraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KickSession" (
    "id" TEXT NOT NULL,
    "pregnancyId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "kicks" JSONB NOT NULL DEFAULT '[]',
    "count" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KickSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaternalLog" (
    "id" TEXT NOT NULL,
    "pregnancyId" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "weightKg" DOUBLE PRECISION,
    "systolic" INTEGER,
    "diastolic" INTEGER,
    "pulse" INTEGER,
    "symptoms" JSONB NOT NULL DEFAULT '[]',
    "note" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaternalLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "pregnancyId" TEXT,
    "householdId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'mkp',
    "scheduledAt" TIMESTAMP(3),
    "windowFrom" TIMESTAMP(3),
    "windowTo" TIMESTAMP(3),
    "location" TEXT,
    "note" TEXT,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "doneAt" TIMESTAMP(3),
    "templateKey" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistItem" (
    "id" TEXT NOT NULL,
    "pregnancyId" TEXT,
    "householdId" TEXT NOT NULL,
    "listKey" TEXT NOT NULL DEFAULT 'hospitalbag',
    "section" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "note" TEXT,
    "quantity" TEXT,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "doneAt" TIMESTAMP(3),
    "doneById" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "custom" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NameSuggestion" (
    "id" TEXT NOT NULL,
    "pregnancyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sex" TEXT NOT NULL DEFAULT 'unknown',
    "note" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NameSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NameVote" (
    "id" TEXT NOT NULL,
    "suggestionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vote" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NameVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "durationSec" INTEGER,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "note" TEXT,
    "running" BOOLEAN NOT NULL DEFAULT false,
    "pausedAt" TIMESTAMP(3),
    "pausedSec" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "clientId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventRevision" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "changedById" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrowthMeasurement" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "measuredAt" TIMESTAMP(3) NOT NULL,
    "weightKg" DOUBLE PRECISION,
    "lengthCm" DOUBLE PRECISION,
    "headCm" DOUBLE PRECISION,
    "note" TEXT,
    "createdById" TEXT NOT NULL,
    "clientId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GrowthMeasurement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "key" TEXT,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'other',
    "achievedAt" TIMESTAMP(3),
    "note" TEXT,
    "mediaId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExerciseLog" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "doneAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rating" INTEGER,
    "note" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "ExerciseLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalEntry" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "happenedAt" TIMESTAMP(3) NOT NULL,
    "title" TEXT,
    "body" TEXT NOT NULL,
    "tags" JSONB NOT NULL DEFAULT '[]',
    "mood" INTEGER,
    "monthPhoto" INTEGER,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JournalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "journalEntryId" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'image',
    "path" TEXT NOT NULL,
    "thumbPath" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "bytes" INTEGER NOT NULL DEFAULT 0,
    "mimeType" TEXT NOT NULL,
    "takenAt" TIMESTAMP(3),
    "caption" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MoodLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "mood" INTEGER NOT NULL,
    "energy" INTEGER NOT NULL,
    "stress" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MoodLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParentSleepLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "hours" DOUBLE PRECISION NOT NULL,
    "quality" INTEGER NOT NULL,
    "wakeCount" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParentSleepLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParentJournalEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "mood" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParentJournalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NightShift" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "userId" TEXT,
    "handoverNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NightShift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reminder" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "childId" TEXT,
    "userId" TEXT,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "repeatEvery" INTEGER,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "sentAt" TIMESTAMP(3),
    "doneAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SleepPrediction" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "basedOnEvent" TEXT,
    "kind" TEXT NOT NULL,
    "windowFrom" TIMESTAMP(3) NOT NULL,
    "windowTo" TIMESTAMP(3) NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "sampleSize" INTEGER NOT NULL DEFAULT 0,
    "method" TEXT NOT NULL DEFAULT 'adaptive',

    CONSTRAINT "SleepPrediction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastOkAt" TIMESTAMP(3),

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "userId" TEXT NOT NULL,
    "napAlerts" BOOLEAN NOT NULL DEFAULT true,
    "napLeadMinutes" INTEGER NOT NULL DEFAULT 15,
    "feedAlerts" BOOLEAN NOT NULL DEFAULT false,
    "medicationAlerts" BOOLEAN NOT NULL DEFAULT true,
    "appointmentAlerts" BOOLEAN NOT NULL DEFAULT true,
    "partnerActivity" BOOLEAN NOT NULL DEFAULT false,
    "quietFrom" TEXT,
    "quietTo" TEXT,
    "ntfyEnabled" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_householdId_idx" ON "User"("householdId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Invite_codeHash_key" ON "Invite"("codeHash");

-- CreateIndex
CREATE INDEX "Invite_householdId_idx" ON "Invite"("householdId");

-- CreateIndex
CREATE INDEX "LoginAttempt_key_createdAt_idx" ON "LoginAttempt"("key", "createdAt");

-- CreateIndex
CREATE INDEX "Child_householdId_idx" ON "Child"("householdId");

-- CreateIndex
CREATE UNIQUE INDEX "Pregnancy_childId_key" ON "Pregnancy"("childId");

-- CreateIndex
CREATE INDEX "Pregnancy_householdId_idx" ON "Pregnancy"("householdId");

-- CreateIndex
CREATE INDEX "Contraction_pregnancyId_startedAt_idx" ON "Contraction"("pregnancyId", "startedAt");

-- CreateIndex
CREATE INDEX "KickSession_pregnancyId_startedAt_idx" ON "KickSession"("pregnancyId", "startedAt");

-- CreateIndex
CREATE INDEX "MaternalLog_pregnancyId_recordedAt_idx" ON "MaternalLog"("pregnancyId", "recordedAt");

-- CreateIndex
CREATE INDEX "Appointment_householdId_scheduledAt_idx" ON "Appointment"("householdId", "scheduledAt");

-- CreateIndex
CREATE INDEX "ChecklistItem_householdId_listKey_idx" ON "ChecklistItem"("householdId", "listKey");

-- CreateIndex
CREATE INDEX "NameSuggestion_pregnancyId_idx" ON "NameSuggestion"("pregnancyId");

-- CreateIndex
CREATE UNIQUE INDEX "NameSuggestion_pregnancyId_name_key" ON "NameSuggestion"("pregnancyId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "NameVote_suggestionId_userId_key" ON "NameVote"("suggestionId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Event_clientId_key" ON "Event"("clientId");

-- CreateIndex
CREATE INDEX "Event_childId_type_startedAt_idx" ON "Event"("childId", "type", "startedAt");

-- CreateIndex
CREATE INDEX "Event_childId_startedAt_idx" ON "Event"("childId", "startedAt");

-- CreateIndex
CREATE INDEX "Event_childId_running_idx" ON "Event"("childId", "running");

-- CreateIndex
CREATE INDEX "EventRevision_eventId_createdAt_idx" ON "EventRevision"("eventId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "GrowthMeasurement_clientId_key" ON "GrowthMeasurement"("clientId");

-- CreateIndex
CREATE INDEX "GrowthMeasurement_childId_measuredAt_idx" ON "GrowthMeasurement"("childId", "measuredAt");

-- CreateIndex
CREATE INDEX "Milestone_childId_achievedAt_idx" ON "Milestone"("childId", "achievedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Milestone_childId_key_key" ON "Milestone"("childId", "key");

-- CreateIndex
CREATE INDEX "ExerciseLog_childId_exerciseId_idx" ON "ExerciseLog"("childId", "exerciseId");

-- CreateIndex
CREATE INDEX "JournalEntry_childId_happenedAt_idx" ON "JournalEntry"("childId", "happenedAt");

-- CreateIndex
CREATE INDEX "MediaAsset_childId_createdAt_idx" ON "MediaAsset"("childId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MoodLog_userId_date_key" ON "MoodLog"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "ParentSleepLog_userId_date_key" ON "ParentSleepLog"("userId", "date");

-- CreateIndex
CREATE INDEX "ParentJournalEntry_userId_createdAt_idx" ON "ParentJournalEntry"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "NightShift_householdId_date_key" ON "NightShift"("householdId", "date");

-- CreateIndex
CREATE INDEX "Reminder_householdId_dueAt_idx" ON "Reminder"("householdId", "dueAt");

-- CreateIndex
CREATE INDEX "Reminder_sentAt_dueAt_idx" ON "Reminder"("sentAt", "dueAt");

-- CreateIndex
CREATE INDEX "SleepPrediction_childId_computedAt_idx" ON "SleepPrediction"("childId", "computedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");

-- AddForeignKey
ALTER TABLE "HouseholdSettings" ADD CONSTRAINT "HouseholdSettings_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Child" ADD CONSTRAINT "Child_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pregnancy" ADD CONSTRAINT "Pregnancy_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pregnancy" ADD CONSTRAINT "Pregnancy_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contraction" ADD CONSTRAINT "Contraction_pregnancyId_fkey" FOREIGN KEY ("pregnancyId") REFERENCES "Pregnancy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KickSession" ADD CONSTRAINT "KickSession_pregnancyId_fkey" FOREIGN KEY ("pregnancyId") REFERENCES "Pregnancy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaternalLog" ADD CONSTRAINT "MaternalLog_pregnancyId_fkey" FOREIGN KEY ("pregnancyId") REFERENCES "Pregnancy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_pregnancyId_fkey" FOREIGN KEY ("pregnancyId") REFERENCES "Pregnancy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistItem" ADD CONSTRAINT "ChecklistItem_pregnancyId_fkey" FOREIGN KEY ("pregnancyId") REFERENCES "Pregnancy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistItem" ADD CONSTRAINT "ChecklistItem_doneById_fkey" FOREIGN KEY ("doneById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NameSuggestion" ADD CONSTRAINT "NameSuggestion_pregnancyId_fkey" FOREIGN KEY ("pregnancyId") REFERENCES "Pregnancy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NameSuggestion" ADD CONSTRAINT "NameSuggestion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NameVote" ADD CONSTRAINT "NameVote_suggestionId_fkey" FOREIGN KEY ("suggestionId") REFERENCES "NameSuggestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NameVote" ADD CONSTRAINT "NameVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRevision" ADD CONSTRAINT "EventRevision_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRevision" ADD CONSTRAINT "EventRevision_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrowthMeasurement" ADD CONSTRAINT "GrowthMeasurement_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrowthMeasurement" ADD CONSTRAINT "GrowthMeasurement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseLog" ADD CONSTRAINT "ExerciseLog_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseLog" ADD CONSTRAINT "ExerciseLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoodLog" ADD CONSTRAINT "MoodLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentSleepLog" ADD CONSTRAINT "ParentSleepLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentJournalEntry" ADD CONSTRAINT "ParentJournalEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NightShift" ADD CONSTRAINT "NightShift_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SleepPrediction" ADD CONSTRAINT "SleepPrediction_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
