-- AlterTable
ALTER TABLE "Purchase" ADD COLUMN     "recipientId" TEXT;
ALTER TABLE "Purchase" ADD COLUMN     "productType" TEXT NOT NULL DEFAULT 'devproduct';
ALTER TABLE "Purchase" ADD COLUMN     "robloxReceiptId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Purchase_robloxReceiptId_key" ON "Purchase"("robloxReceiptId");

-- CreateIndex
CREATE INDEX "Purchase_recipientId_idx" ON "Purchase"("recipientId");

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
