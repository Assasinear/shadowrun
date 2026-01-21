/*
  Warnings:

  - You are about to drop the column `creatorId` on the `payment_requests` table. All the data in the column will be lost.
  - You are about to drop the column `targetId` on the `payment_requests` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "payment_requests" DROP CONSTRAINT "payment_requests_creatorId_fkey";

-- DropForeignKey
ALTER TABLE "payment_requests" DROP CONSTRAINT "payment_requests_targetHostId_fkey";

-- DropForeignKey
ALTER TABLE "payment_requests" DROP CONSTRAINT "payment_requests_targetPersonaId_fkey";

-- AlterTable
ALTER TABLE "payment_requests" DROP COLUMN "creatorId",
DROP COLUMN "targetId",
ADD COLUMN     "creatorHostId" TEXT,
ADD COLUMN     "creatorPersonaId" TEXT,
ADD COLUMN     "targetHostId" TEXT,
ADD COLUMN     "targetPersonaId" TEXT;

-- AddForeignKey
ALTER TABLE "payment_requests" ADD CONSTRAINT "payment_requests_creatorPersonaId_fkey" FOREIGN KEY ("creatorPersonaId") REFERENCES "personas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_requests" ADD CONSTRAINT "payment_requests_creatorHostId_fkey" FOREIGN KEY ("creatorHostId") REFERENCES "hosts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_requests" ADD CONSTRAINT "payment_requests_targetPersonaId_fkey" FOREIGN KEY ("targetPersonaId") REFERENCES "personas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_requests" ADD CONSTRAINT "payment_requests_targetHostId_fkey" FOREIGN KEY ("targetHostId") REFERENCES "hosts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
