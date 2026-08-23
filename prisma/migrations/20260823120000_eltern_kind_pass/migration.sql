-- Umbenennung Mutter-Kind-Pass -> Eltern-Kind-Pass.
-- Grundlage: Eltern-Kind-Pass-Gesetz (EKPG 2023), in Kraft seit 1. Jaenner 2024.
-- Betrifft bestehende Zeilen; der Default der Spalte wandert mit.

ALTER TABLE "Appointment" ALTER COLUMN "category" SET DEFAULT 'ekp';

UPDATE "Appointment" SET "category" = 'ekp' WHERE "category" = 'mkp';

UPDATE "Appointment"
   SET "templateKey" = 'ekp-' || substring("templateKey" from 5)
 WHERE "templateKey" LIKE 'mkp-%';

UPDATE "Appointment"
   SET "title" = replace("title", 'Mutter-Kind-Pass', 'Eltern-Kind-Pass')
 WHERE "title" LIKE '%Mutter-Kind-Pass%';

UPDATE "Appointment"
   SET "note" = replace("note", 'Mutter-Kind-Pass', 'Eltern-Kind-Pass')
 WHERE "note" LIKE '%Mutter-Kind-Pass%';

UPDATE "ChecklistItem"
   SET "label" = replace("label", 'Mutter-Kind-Pass', 'Eltern-Kind-Pass')
 WHERE "label" LIKE '%Mutter-Kind-Pass%';

UPDATE "ChecklistItem" SET "templateKey" = 'ekp' WHERE "templateKey" = 'mkp';

UPDATE "ChecklistItem"
   SET "note" = replace("note", 'Mutter-Kind-Pass', 'Eltern-Kind-Pass')
 WHERE "note" LIKE '%Mutter-Kind-Pass%';
