-- AlterTable
-- Tracks which Level the saved progress was earned on, so stale progress from a different level
-- (e.g. one the player was replaying) can be discarded on load instead of carrying over to their
-- current Level (see client/ServerScriptService/Resources/StatLoaders.luau)
ALTER TABLE "MiningPlayerStats" ADD COLUMN     "progressLevel" INTEGER NOT NULL DEFAULT 1;
