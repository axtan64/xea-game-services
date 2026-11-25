-- CreateTable
CREATE TABLE "CutcGlobalEvent" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "endsAt" TIMESTAMP(3),
    "createdBy" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CutcGlobalEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CutcGlobalEvent_kind_endsAt_idx" ON "CutcGlobalEvent"("kind", "endsAt");
