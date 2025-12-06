/*
  Warnings:

  - Added the required column `userId` to the `Snapshot` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Snapshot" DROP CONSTRAINT "Snapshot_recordedByUserId_fkey";

-- AlterTable
ALTER TABLE "Snapshot" ADD COLUMN     "userId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Snapshot" ADD CONSTRAINT "Snapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
