-- Consolidate seenIntroTutorial/seenHireTutorial (one column each) into a single seenTutorials Map<Key, true>,
-- matching the unlockedAreas/ownedProducts pattern. Data-preserving: backfills existing true flags before
-- dropping the old columns.

-- AlterTable: add the new column
ALTER TABLE "MiningPlayerStats" ADD COLUMN     "seenTutorials" JSONB NOT NULL DEFAULT '{}';

-- Backfill: merge each old boolean flag into the new map under its TutorialSequences Key
UPDATE "MiningPlayerStats"
SET "seenTutorials" = "seenTutorials"
    || CASE WHEN "seenIntroTutorial" THEN '{"Intro": true}'::jsonb ELSE '{}'::jsonb END
    || CASE WHEN "seenHireTutorial" THEN '{"HireFirstHero": true}'::jsonb ELSE '{}'::jsonb END;

-- AlterTable: drop the old columns
ALTER TABLE "MiningPlayerStats" DROP COLUMN "seenIntroTutorial";
ALTER TABLE "MiningPlayerStats" DROP COLUMN "seenHireTutorial";
