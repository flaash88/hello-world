-- AlterTable
ALTER TABLE "ChecklistItem" ADD COLUMN     "templateKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ChecklistItem_householdId_listKey_templateKey_key" ON "ChecklistItem"("householdId", "listKey", "templateKey");

