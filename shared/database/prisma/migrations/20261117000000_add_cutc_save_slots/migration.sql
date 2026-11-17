-- CreateTable
CREATE TABLE "CutcSaveSlot" (
    "id" TEXT NOT NULL,
    "ownerId" BIGINT NOT NULL,
    "slot" INTEGER NOT NULL,
    "data" JSONB,
    "version" INTEGER NOT NULL DEFAULT 0,
    "cleanShare" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cash" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "partySize" INTEGER NOT NULL DEFAULT 1,
    "lastPlayedAt" TIMESTAMP(3),
    "lockId" TEXT,
    "lockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CutcSaveSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CutcParty" (
    "serverId" TEXT NOT NULL,
    "ownerId" BIGINT NOT NULL,
    "slot" INTEGER NOT NULL,
    "members" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CutcParty_pkey" PRIMARY KEY ("serverId")
);

CREATE UNIQUE INDEX "CutcSaveSlot_ownerId_slot_key" ON "CutcSaveSlot"("ownerId", "slot");
