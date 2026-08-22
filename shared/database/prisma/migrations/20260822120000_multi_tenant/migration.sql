-- CreateTable
CREATE TABLE "Game" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gatewayTokenHash" TEXT NOT NULL,
    "robloxUniverseId" BIGINT,
    "robloxOpenCloudApiKey" TEXT,
    "discordWebhookUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Game_slug_key" ON "Game"("slug");
CREATE UNIQUE INDEX "Game_gatewayTokenHash_key" ON "Game"("gatewayTokenHash");

-- CreateTable
CREATE TABLE "GameMembership" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "bannedAt" TIMESTAMP(3),
    "banReason" TEXT,
    "banExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameMembership_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GameMembership_gameId_userId_key" ON "GameMembership"("gameId", "userId");

ALTER TABLE "GameMembership" ADD CONSTRAINT "GameMembership_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GameMembership" ADD CONSTRAINT "GameMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed a Game row for the existing mining game, so existing Purchase/User ban+admin data has a
-- tenant to attach to below. gatewayTokenHash is a placeholder - rotate it to the real (already
-- deployed) ROBLOX_AUTH value via Game.rotateToken() before this reaches production, so existing
-- game servers don't need a new token. robloxUniverseId/robloxOpenCloudApiKey/discordWebhookUrl
-- are left NULL - fill those in from the current deployment/.env too (see shared/database/models/Game.js).
INSERT INTO "Game" ("id", "slug", "name", "gatewayTokenHash", "createdAt", "updatedAt")
VALUES ('00000000-0000-0000-0000-000000000001', 'mining', 'Xea''s Mining Incremental', 'REPLACE_ME_VIA_Game.rotateToken', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Backfill GameMembership from the User rows that currently carry ban/admin state
INSERT INTO "GameMembership" ("id", "gameId", "userId", "isAdmin", "bannedAt", "banReason", "banExpiresAt", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, '00000000-0000-0000-0000-000000000001', "id", "isAdmin", "bannedAt", "banReason", "banExpiresAt", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "User"
WHERE "isAdmin" = true OR "bannedAt" IS NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "isAdmin",
DROP COLUMN "bannedAt",
DROP COLUMN "banReason",
DROP COLUMN "banExpiresAt";

-- AlterTable: Purchase.gameId (existing rows all belong to the mining game)
ALTER TABLE "Purchase" ADD COLUMN "gameId" TEXT;
UPDATE "Purchase" SET "gameId" = '00000000-0000-0000-0000-000000000001';
ALTER TABLE "Purchase" ALTER COLUMN "gameId" SET NOT NULL;
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameTable
ALTER TABLE "PlayerStats" RENAME TO "MiningPlayerStats";
ALTER TABLE "MiningPlayerStats" RENAME CONSTRAINT "PlayerStats_pkey" TO "MiningPlayerStats_pkey";

-- CreateTable
CREATE TABLE "DonationPlayerStats" (
    "robloxId" BIGINT NOT NULL,
    "credits" INTEGER NOT NULL DEFAULT 0,
    "unclaimedRobux" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DonationPlayerStats_pkey" PRIMARY KEY ("robloxId")
);
