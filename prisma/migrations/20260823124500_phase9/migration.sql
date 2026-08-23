-- CreateTable
CREATE TABLE "VorsorgeEntry" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "templateKey" TEXT NOT NULL,
    "doneAt" TIMESTAMP(3) NOT NULL,
    "ort" TEXT,
    "note" TEXT,
    "mediaId" TEXT,
    "eventId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VorsorgeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tooth" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "toothKey" TEXT NOT NULL,
    "eruptedOn" TIMESTAMP(3),
    "lostOn" TIMESTAMP(3),
    "note" TEXT,
    "mediaId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tooth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MilkPortion" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "childId" TEXT,
    "abgepumptAm" TIMESTAMP(3) NOT NULL,
    "mengeMl" INTEGER NOT NULL,
    "lagerort" TEXT NOT NULL,
    "behaelter" TEXT,
    "status" TEXT NOT NULL DEFAULT 'vorraetig',
    "aufgetautAm" TIMESTAMP(3),
    "verbrauchtAm" TIMESTAMP(3),
    "notiz" TEXT,
    "eventId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MilkPortion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AudioNote" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "path" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "bytes" INTEGER NOT NULL,
    "durationSec" INTEGER,
    "tags" JSONB NOT NULL DEFAULT '[]',
    "milestoneId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AudioNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VorsorgeEntry_childId_doneAt_idx" ON "VorsorgeEntry"("childId", "doneAt");

-- CreateIndex
CREATE UNIQUE INDEX "VorsorgeEntry_childId_kind_templateKey_key" ON "VorsorgeEntry"("childId", "kind", "templateKey");

-- CreateIndex
CREATE INDEX "Tooth_childId_idx" ON "Tooth"("childId");

-- CreateIndex
CREATE UNIQUE INDEX "Tooth_childId_toothKey_key" ON "Tooth"("childId", "toothKey");

-- CreateIndex
CREATE INDEX "MilkPortion_householdId_status_idx" ON "MilkPortion"("householdId", "status");

-- CreateIndex
CREATE INDEX "MilkPortion_householdId_abgepumptAm_idx" ON "MilkPortion"("householdId", "abgepumptAm");

-- CreateIndex
CREATE UNIQUE INDEX "AudioNote_path_key" ON "AudioNote"("path");

-- CreateIndex
CREATE INDEX "AudioNote_childId_recordedAt_idx" ON "AudioNote"("childId", "recordedAt");

-- AddForeignKey
ALTER TABLE "VorsorgeEntry" ADD CONSTRAINT "VorsorgeEntry_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VorsorgeEntry" ADD CONSTRAINT "VorsorgeEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tooth" ADD CONSTRAINT "Tooth_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tooth" ADD CONSTRAINT "Tooth_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MilkPortion" ADD CONSTRAINT "MilkPortion_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MilkPortion" ADD CONSTRAINT "MilkPortion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AudioNote" ADD CONSTRAINT "AudioNote_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AudioNote" ADD CONSTRAINT "AudioNote_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

