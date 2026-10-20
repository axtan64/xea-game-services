-- AlterTable
ALTER TABLE "MiningPlayerStats" ADD COLUMN     "mealsEaten" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastMealEatenAt" INTEGER NOT NULL DEFAULT 0;
