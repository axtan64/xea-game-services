-- AlterTable
ALTER TABLE "DonationPlayerStats" ADD COLUMN "robuxRaised" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "robuxDonated" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "DonationGift" (
    "id" TEXT NOT NULL,
    "fromRobloxId" BIGINT NOT NULL,
    "toRobloxId" BIGINT NOT NULL,
    "amount" INTEGER NOT NULL,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DonationGift_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DonationGift_toRobloxId_idx" ON "DonationGift"("toRobloxId");
CREATE INDEX "DonationGift_fromRobloxId_idx" ON "DonationGift"("fromRobloxId");
