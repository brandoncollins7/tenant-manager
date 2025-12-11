-- CreateTable
CREATE TABLE "chore_completion_photos" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completionId" TEXT NOT NULL,
    "photoPath" TEXT NOT NULL,
    "photoUploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "chore_completion_photos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "chore_completion_photos_completionId_idx" ON "chore_completion_photos"("completionId");

-- AddForeignKey
ALTER TABLE "chore_completion_photos" ADD CONSTRAINT "chore_completion_photos_completionId_fkey" FOREIGN KEY ("completionId") REFERENCES "chore_completions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
