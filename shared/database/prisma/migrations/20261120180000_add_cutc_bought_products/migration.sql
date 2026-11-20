-- AlterTable
ALTER TABLE "CutcSaveSlot" ADD COLUMN "boughtProducts" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "CutcSaveSlot_boughtProducts_finishedIn_idx" ON "CutcSaveSlot"("boughtProducts", "finishedIn");
