-- CreateTable
CREATE TABLE "CutcPlayerStats" (
    "robloxId" BIGINT NOT NULL,
    "timePlayed" INTEGER NOT NULL DEFAULT 0,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "ownedProducts" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CutcPlayerStats_pkey" PRIMARY KEY ("robloxId")
);
