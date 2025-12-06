/*
  Warnings:

  - You are about to drop the column `userId` on the `balance_snapshot` table. All the data in the column will be lost.
  - You are about to drop the `Test` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `circleId` to the `balance_snapshot` table without a default value. This is not possible if the table is not empty.
  - Added the required column `recordedByUserId` to the `balance_snapshot` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `balance_snapshot` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CircleRole" AS ENUM ('ADMIN', 'EDITOR', 'VIEWER');

-- DropForeignKey
ALTER TABLE "balance_snapshot" DROP CONSTRAINT "balance_snapshot_userId_fkey";

-- AlterTable
ALTER TABLE "balance_snapshot" DROP COLUMN "userId",
ADD COLUMN     "circleId" TEXT NOT NULL,
ADD COLUMN     "recordedByUserId" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- DropTable
DROP TABLE "Test";

-- CreateTable
CREATE TABLE "Circle" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "walletName" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'JPY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Circle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CircleMember" (
    "id" TEXT NOT NULL,
    "circleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "CircleRole" NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CircleMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CircleMember_circleId_userId_key" ON "CircleMember"("circleId", "userId");

-- CreateIndex
CREATE INDEX "balance_snapshot_circleId_recordedAt_idx" ON "balance_snapshot"("circleId", "recordedAt");

-- AddForeignKey
ALTER TABLE "CircleMember" ADD CONSTRAINT "CircleMember_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "Circle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CircleMember" ADD CONSTRAINT "CircleMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "balance_snapshot" ADD CONSTRAINT "balance_snapshot_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "Circle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "balance_snapshot" ADD CONSTRAINT "balance_snapshot_recordedByUserId_fkey" FOREIGN KEY ("recordedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
