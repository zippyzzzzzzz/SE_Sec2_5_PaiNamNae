-- CreateEnum
CREATE TYPE "UserVerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED', 'AUTO_REJECTED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "autoVerifyConfidence" DOUBLE PRECISION,
ADD COLUMN     "autoVerifyHighThreshold" DOUBLE PRECISION,
ADD COLUMN     "autoVerifyLowThreshold" DOUBLE PRECISION,
ADD COLUMN     "verificationStatus" "UserVerificationStatus" NOT NULL DEFAULT 'PENDING';
