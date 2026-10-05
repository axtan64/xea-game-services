-- AlterTable
-- SelectedLevel is no longer saved - it always starts out matching the player's real Level on
-- join (see client/ServerScriptService/Resources/StatLoaders.luau)
ALTER TABLE "MiningPlayerStats" DROP COLUMN "selectedLevel";
