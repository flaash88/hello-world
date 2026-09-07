-- AlterTable
ALTER TABLE "AudioNote" ADD COLUMN     "clientId" TEXT,
ADD COLUMN     "peaks" JSONB NOT NULL DEFAULT '[]';

-- CreateIndex
CREATE UNIQUE INDEX "AudioNote_clientId_key" ON "AudioNote"("clientId");

