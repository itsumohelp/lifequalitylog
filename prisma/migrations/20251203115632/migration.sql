/*
  Warnings:

  - Added the required column `ended` to the `Record` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Record" ADD COLUMN     "ended" TIMESTAMPTZ NOT NULL;

-- CreateIndex
CREATE INDEX "Record_todoid_idx" ON "Record"("todoid");
