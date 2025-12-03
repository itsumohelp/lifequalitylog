/*
  Warnings:

  - Added the required column `name` to the `Todo` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Todo" ADD COLUMN     "name" TEXT NOT NULL;
