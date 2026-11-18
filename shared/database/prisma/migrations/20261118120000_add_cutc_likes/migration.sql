-- CreateTable
CREATE TABLE "CutcLike" (
    "id" TEXT NOT NULL,
    "userId" BIGINT NOT NULL,
    "likingId" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CutcLike_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CutcLike_userId_likingId_key" ON "CutcLike"("userId", "likingId");
CREATE INDEX "CutcLike_likingId_idx" ON "CutcLike"("likingId");
