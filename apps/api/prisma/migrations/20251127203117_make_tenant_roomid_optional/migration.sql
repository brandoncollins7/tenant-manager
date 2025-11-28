-- DropForeignKey
ALTER TABLE "tenants" DROP CONSTRAINT "tenants_roomId_fkey";

-- AlterTable
ALTER TABLE "tenants" ALTER COLUMN "roomId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;
