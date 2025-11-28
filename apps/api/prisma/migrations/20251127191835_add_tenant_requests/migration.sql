-- CreateEnum
CREATE TYPE "CompletionStatus" AS ENUM ('PENDING', 'COMPLETED', 'MISSED', 'EXCUSED');

-- CreateEnum
CREATE TYPE "SwapStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('CHORE_REMINDER', 'CHORE_DUE_TODAY', 'CHORE_OVERDUE', 'SWAP_REQUEST_RECEIVED', 'SWAP_REQUEST_APPROVED', 'SWAP_REQUEST_REJECTED', 'WELCOME', 'REQUEST_RECEIVED', 'REQUEST_RESOLVED');

-- CreateEnum
CREATE TYPE "RequestType" AS ENUM ('CLEANING_SUPPLIES', 'MAINTENANCE_ISSUE');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'RESOLVED');

-- CreateTable
CREATE TABLE "units" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/Toronto',
    "adminEmail" TEXT,

    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "unitId" TEXT NOT NULL,
    "roomNumber" TEXT NOT NULL,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "roomId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "leaseDocument" TEXT,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "occupants" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "choreDay" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "occupants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "magic_links" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "usedAt" TIMESTAMP(3),
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "magic_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admins" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_magic_links" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "usedAt" TIMESTAMP(3),
    "adminId" TEXT NOT NULL,

    CONSTRAINT "admin_magic_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chore_definitions" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "unitId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "chore_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chore_schedules" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "weekId" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chore_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chore_completions" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "occupantId" TEXT NOT NULL,
    "choreId" TEXT NOT NULL,
    "status" "CompletionStatus" NOT NULL DEFAULT 'PENDING',
    "completedAt" TIMESTAMP(3),
    "photoPath" TEXT,
    "photoUploadedAt" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "chore_completions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "swap_requests" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "requesterId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "status" "SwapStatus" NOT NULL DEFAULT 'PENDING',
    "respondedAt" TIMESTAMP(3),
    "reason" TEXT,

    CONSTRAINT "swap_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "temp_assignments" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "occupantId" TEXT NOT NULL,
    "originalDay" INTEGER NOT NULL,
    "weekId" TEXT NOT NULL,
    "reason" TEXT,

    CONSTRAINT "temp_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenantId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "emailSent" BOOLEAN NOT NULL DEFAULT false,
    "emailSentAt" TIMESTAMP(3),
    "metadata" JSONB,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requests" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "type" "RequestType" NOT NULL,
    "description" TEXT NOT NULL,
    "photoPath" TEXT,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "notes" TEXT,

    CONSTRAINT "requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_unitId_roomNumber_key" ON "rooms"("unitId", "roomNumber");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_roomId_key" ON "tenants"("roomId");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_email_key" ON "tenants"("email");

-- CreateIndex
CREATE UNIQUE INDEX "magic_links_token_key" ON "magic_links"("token");

-- CreateIndex
CREATE INDEX "magic_links_token_idx" ON "magic_links"("token");

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_key" ON "admins"("email");

-- CreateIndex
CREATE UNIQUE INDEX "admin_magic_links_token_key" ON "admin_magic_links"("token");

-- CreateIndex
CREATE INDEX "admin_magic_links_token_idx" ON "admin_magic_links"("token");

-- CreateIndex
CREATE UNIQUE INDEX "chore_schedules_weekId_key" ON "chore_schedules"("weekId");

-- CreateIndex
CREATE UNIQUE INDEX "chore_completions_scheduleId_occupantId_choreId_key" ON "chore_completions"("scheduleId", "occupantId", "choreId");

-- CreateIndex
CREATE UNIQUE INDEX "temp_assignments_occupantId_weekId_originalDay_key" ON "temp_assignments"("occupantId", "weekId", "originalDay");

-- CreateIndex
CREATE INDEX "notifications_tenantId_isRead_idx" ON "notifications"("tenantId", "isRead");

-- CreateIndex
CREATE INDEX "requests_tenantId_idx" ON "requests"("tenantId");

-- CreateIndex
CREATE INDEX "requests_unitId_status_idx" ON "requests"("unitId", "status");

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "occupants" ADD CONSTRAINT "occupants_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "magic_links" ADD CONSTRAINT "magic_links_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_magic_links" ADD CONSTRAINT "admin_magic_links_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chore_definitions" ADD CONSTRAINT "chore_definitions_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chore_completions" ADD CONSTRAINT "chore_completions_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "chore_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chore_completions" ADD CONSTRAINT "chore_completions_occupantId_fkey" FOREIGN KEY ("occupantId") REFERENCES "occupants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chore_completions" ADD CONSTRAINT "chore_completions_choreId_fkey" FOREIGN KEY ("choreId") REFERENCES "chore_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "swap_requests" ADD CONSTRAINT "swap_requests_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "occupants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "swap_requests" ADD CONSTRAINT "swap_requests_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "occupants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "swap_requests" ADD CONSTRAINT "swap_requests_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "chore_schedules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "temp_assignments" ADD CONSTRAINT "temp_assignments_occupantId_fkey" FOREIGN KEY ("occupantId") REFERENCES "occupants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
