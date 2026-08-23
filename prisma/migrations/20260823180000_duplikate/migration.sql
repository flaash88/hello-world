-- CreateTable
CREATE TABLE "EventDuplicate" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "olderEventId" TEXT NOT NULL,
    "newerEventId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'offen',
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,

    CONSTRAINT "EventDuplicate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventDuplicate_childId_status_idx" ON "EventDuplicate"("childId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "EventDuplicate_olderEventId_newerEventId_key" ON "EventDuplicate"("olderEventId", "newerEventId");

