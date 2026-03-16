-- CreateEnum
CREATE TYPE "ReportCategory" AS ENUM ('INAPPROPRIATE_BEHAVIOR', 'LOST_ITEM', 'CLEANLINESS', 'OTHER', 'VIOLATED_AGREEMENT', 'DETAILS_MISMATCH');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'CONTACTING_DRIVER', 'RESOLVED', 'CLOSED');

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "passengerId" TEXT NOT NULL,
    "category" "ReportCategory" NOT NULL,
    "reportTopic" TEXT NOT NULL,
    "reportDescription" TEXT NOT NULL,
    "reportImages" JSON,
    "reportVideo" TEXT,
    "contactFirstName" TEXT,
    "contactLastName" TEXT,
    "contactPhoneNumber" TEXT,
    "contactEmail" TEXT,
    "reportStatus" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Report_bookingId_idx" ON "Report"("bookingId");

-- CreateIndex
CREATE INDEX "Report_passengerId_idx" ON "Report"("passengerId");

-- CreateIndex
CREATE INDEX "Report_reportStatus_idx" ON "Report"("reportStatus");

-- CreateIndex
CREATE INDEX "Report_createdAt_idx" ON "Report"("createdAt");

-- CreateIndex
CREATE INDEX "Report_reportStatus_createdAt_idx" ON "Report"("reportStatus", "createdAt");

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
