/*
  Warnings:

  - You are about to drop the `balance_snapshot` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "balance_snapshot" DROP CONSTRAINT "balance_snapshot_circleId_fkey";

-- DropForeignKey
ALTER TABLE "balance_snapshot" DROP CONSTRAINT "balance_snapshot_recordedByUserId_fkey";

-- DropTable
DROP TABLE "balance_snapshot";

-- CreateTable
CREATE TABLE "Snapshot" (
    "id" TEXT NOT NULL,
    "circleId" TEXT NOT NULL,
    "recordedByUserId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "memo" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Snapshot_circleId_recordedAt_idx" ON "Snapshot"("circleId", "recordedAt");

-- AddForeignKey
ALTER TABLE "Snapshot" ADD CONSTRAINT "Snapshot_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "Circle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Snapshot" ADD CONSTRAINT "Snapshot_recordedByUserId_fkey" FOREIGN KEY ("recordedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
