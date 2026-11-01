-- AlterTable
ALTER TABLE "MiningPlayerStats" ADD COLUMN     "hasVisitedMiningArea" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "MiningPlayerStats" ADD COLUMN     "seenIntroTutorial" BOOLEAN NOT NULL DEFAULT false;
