-- AlterTable
ALTER TABLE "Household" ADD COLUMN     "featureLevel" TEXT NOT NULL DEFAULT 'protokoll',
ADD COLUMN     "featureOverrides" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "featurePauseUntil" TIMESTAMP(3),
ADD COLUMN     "introSeenAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "HouseholdSettings" ALTER COLUMN "milkExpiryPush" SET DEFAULT false;

-- AlterTable
ALTER TABLE "NotificationPreference" DROP COLUMN "feedAlerts",
DROP COLUMN "napAlerts",
DROP COLUMN "partnerActivity",
ADD COLUMN     "milkStockAlerts" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "nightShiftAlerts" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "quietAskedAt" TIMESTAMP(3),
ADD COLUMN     "sleepWindowAlerts" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "medicationAlerts" SET DEFAULT false;


-- Bestehende Haushalte ziehen mit: die geaenderten Vorgaben oben gelten nur
-- fuer neue Zeilen. Phase 11 nimmt die Benachrichtigungen bewusst auch dort
-- zurueck, wo sie schon eingeschaltet waren – wer sie wieder will, findet die
-- Schalter unter "Mehr -> Benachrichtigungen".
UPDATE "NotificationPreference" SET "medicationAlerts" = false;
UPDATE "HouseholdSettings" SET "milkExpiryPush" = false;
