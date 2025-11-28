-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'PROPERTY_MANAGER');

-- AlterTable
ALTER TABLE "admins" ADD COLUMN     "role" "AdminRole" NOT NULL DEFAULT 'PROPERTY_MANAGER';

-- CreateTable
CREATE TABLE "admin_unit_assignments" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "adminId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,

    CONSTRAINT "admin_unit_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_unit_assignments_adminId_unitId_key" ON "admin_unit_assignments"("adminId", "unitId");

-- AddForeignKey
ALTER TABLE "admin_unit_assignments" ADD CONSTRAINT "admin_unit_assignments_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_unit_assignments" ADD CONSTRAINT "admin_unit_assignments_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
