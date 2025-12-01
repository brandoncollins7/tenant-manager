-- DropForeignKey
ALTER TABLE "chore_completions" DROP CONSTRAINT "chore_completions_choreId_fkey";

-- DropForeignKey
ALTER TABLE "chore_completions" DROP CONSTRAINT "chore_completions_occupantId_fkey";

-- AddForeignKey
ALTER TABLE "chore_completions" ADD CONSTRAINT "chore_completions_occupantId_fkey" FOREIGN KEY ("occupantId") REFERENCES "occupants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chore_completions" ADD CONSTRAINT "chore_completions_choreId_fkey" FOREIGN KEY ("choreId") REFERENCES "chore_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
