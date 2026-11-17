-- AlterTable
ALTER TABLE "CutcSaveSlot" ADD COLUMN     "serverId" TEXT,
ADD COLUMN     "accessCode" TEXT,
ADD COLUMN     "playerCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "ownerPresent" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "CutcParty" ADD COLUMN     "accessCode" TEXT;

-- CreateTable
CREATE TABLE "CutcSlotAccess" (
    "id" TEXT NOT NULL,
    "ownerId" BIGINT NOT NULL,
    "slot" INTEGER NOT NULL,
    "access" TEXT NOT NULL DEFAULT 'Friends',
    "allowAway" BOOLEAN NOT NULL DEFAULT false,
    "inviteCode" TEXT,
    "members" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CutcSlotAccess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CutcSlotAccess_inviteCode_key" ON "CutcSlotAccess"("inviteCode");

-- CreateIndex
CREATE UNIQUE INDEX "CutcSlotAccess_ownerId_slot_key" ON "CutcSlotAccess"("ownerId", "slot");

-- CreateIndex
CREATE INDEX "CutcParty_ownerId_slot_idx" ON "CutcParty"("ownerId", "slot");
