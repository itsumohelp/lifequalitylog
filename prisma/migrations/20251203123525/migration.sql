/*
  Warnings:

  - Changed the type of `todoid` on the `Record` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "Record" DROP COLUMN "todoid",
ADD COLUMN     "todoid" UUID NOT NULL;

-- CreateIndex
CREATE INDEX "Record_todoid_idx" ON "Record"("todoid");

-- AddForeignKey
ALTER TABLE "Record" ADD CONSTRAINT "Record_todoid_fkey" FOREIGN KEY ("todoid") REFERENCES "Todo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
