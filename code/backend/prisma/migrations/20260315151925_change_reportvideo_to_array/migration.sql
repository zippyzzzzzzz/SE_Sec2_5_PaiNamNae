/*
  Warnings:

  - You are about to drop the column `reportVideo` on the `Report` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Report" DROP COLUMN "reportVideo",
ADD COLUMN     "reportVideos" JSON;
