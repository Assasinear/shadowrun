/*
  Warnings:

  - You are about to drop the column `targetId` on the `hack_sessions` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "hack_sessions" DROP CONSTRAINT "hack_sessions_targetHostId_fkey";

-- DropForeignKey
ALTER TABLE "hack_sessions" DROP CONSTRAINT "hack_sessions_targetPersonaId_fkey";

-- AlterTable
ALTER TABLE "hack_sessions" DROP COLUMN "targetId",
ADD COLUMN     "targetHostId" TEXT,
ADD COLUMN     "targetPersonaId" TEXT;

-- AddForeignKey
ALTER TABLE "hack_sessions" ADD CONSTRAINT "hack_sessions_targetPersonaId_fkey" FOREIGN KEY ("targetPersonaId") REFERENCES "personas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hack_sessions" ADD CONSTRAINT "hack_sessions_targetHostId_fkey" FOREIGN KEY ("targetHostId") REFERENCES "hosts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
