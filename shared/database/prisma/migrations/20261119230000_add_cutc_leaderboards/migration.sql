-- AlterTable
ALTER TABLE "CutcSaveSlot" ADD COLUMN     "finishedIn" INTEGER;

-- CreateIndex
CREATE INDEX "CutcSaveSlot_cleanShare_idx" ON "CutcSaveSlot"("cleanShare");

-- CreateIndex
CREATE INDEX "CutcSaveSlot_finishedIn_idx" ON "CutcSaveSlot"("finishedIn");

-- CreateIndex
CREATE INDEX "CutcPlayerStats_tilesCleaned_idx" ON "CutcPlayerStats"("tilesCleaned");
