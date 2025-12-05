-- CreateEnum
CREATE TYPE "ConcernType" AS ENUM ('NOISE', 'CLEANLINESS', 'HARASSMENT', 'PROPERTY_DAMAGE', 'OTHER');

-- CreateEnum
CREATE TYPE "ConcernSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "ConcernStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED');

-- CreateTable
CREATE TABLE "concerns" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reportedId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "type" "ConcernType" NOT NULL,
    "severity" "ConcernSeverity" NOT NULL DEFAULT 'MEDIUM',
    "description" TEXT NOT NULL,
    "photoPath" TEXT,
    "status" "ConcernStatus" NOT NULL DEFAULT 'PENDING',
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "notes" TEXT,

    CONSTRAINT "concerns_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "concerns_reporterId_idx" ON "concerns"("reporterId");

-- CreateIndex
CREATE INDEX "concerns_reportedId_idx" ON "concerns"("reportedId");

-- CreateIndex
CREATE INDEX "concerns_unitId_status_idx" ON "concerns"("unitId", "status");

-- AddForeignKey
ALTER TABLE "concerns" ADD CONSTRAINT "concerns_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concerns" ADD CONSTRAINT "concerns_reportedId_fkey" FOREIGN KEY ("reportedId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concerns" ADD CONSTRAINT "concerns_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
