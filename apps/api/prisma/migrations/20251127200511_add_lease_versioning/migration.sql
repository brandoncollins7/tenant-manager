-- CreateTable
CREATE TABLE "lease_documents" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenantId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "filename" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "lease_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lease_documents_tenantId_isCurrent_idx" ON "lease_documents"("tenantId", "isCurrent");

-- CreateIndex
CREATE UNIQUE INDEX "lease_documents_tenantId_version_key" ON "lease_documents"("tenantId", "version");

-- AddForeignKey
ALTER TABLE "lease_documents" ADD CONSTRAINT "lease_documents_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate existing leases to version 1
INSERT INTO "lease_documents" ("id", "tenantId", "version", "filename", "uploadedBy", "uploadedAt", "notes", "isCurrent")
SELECT
  gen_random_uuid(),
  id as "tenantId",
  1 as version,
  "leaseDocument" as filename,
  'system@migration' as "uploadedBy",
  "createdAt" as "uploadedAt",
  'Migrated from old system' as notes,
  true as "isCurrent"
FROM "tenants"
WHERE "leaseDocument" IS NOT NULL;
