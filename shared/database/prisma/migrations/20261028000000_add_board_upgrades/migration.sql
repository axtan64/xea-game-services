-- AlterTable
ALTER TABLE "MiningPlayerStats" ADD COLUMN     "levelToken" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "MiningPlayerStats" ADD COLUMN     "boardUpgrades" JSONB NOT NULL DEFAULT '{}';
