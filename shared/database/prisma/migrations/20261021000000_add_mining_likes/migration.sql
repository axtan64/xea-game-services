-- CreateTable
CREATE TABLE "MiningLike" (
    "id" TEXT NOT NULL,
    "userId" BIGINT NOT NULL,
    "likingId" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MiningLike_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MiningLike_userId_likingId_key" ON "MiningLike"("userId", "likingId");
CREATE INDEX "MiningLike_likingId_idx" ON "MiningLike"("likingId");
