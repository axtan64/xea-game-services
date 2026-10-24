-- AlterTable
ALTER TABLE "MiningPlayerStats" ADD COLUMN     "pendingUnobtanium" TEXT NOT NULL DEFAULT '0;0',
ADD COLUMN     "lifetimeUnobtanium" TEXT NOT NULL DEFAULT '0;0',
ADD COLUMN     "lifeLength" INTEGER NOT NULL DEFAULT 0;
