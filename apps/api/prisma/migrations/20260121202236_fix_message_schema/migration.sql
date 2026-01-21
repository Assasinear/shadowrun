/*
  Warnings:

  - You are about to drop the column `receiverId` on the `messages` table. All the data in the column will be lost.
  - You are about to drop the column `senderId` on the `messages` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "messages" DROP CONSTRAINT "messages_receiverHostId_fkey";

-- DropForeignKey
ALTER TABLE "messages" DROP CONSTRAINT "messages_receiverPersonaId_fkey";

-- DropForeignKey
ALTER TABLE "messages" DROP CONSTRAINT "messages_senderId_fkey";

-- DropIndex
DROP INDEX "messages_receiverType_receiverId_idx";

-- DropIndex
DROP INDEX "messages_senderType_senderId_idx";

-- AlterTable
ALTER TABLE "messages" DROP COLUMN "receiverId",
DROP COLUMN "senderId",
ADD COLUMN     "receiverHostId" TEXT,
ADD COLUMN     "receiverPersonaId" TEXT,
ADD COLUMN     "senderHostId" TEXT,
ADD COLUMN     "senderPersonaId" TEXT;

-- CreateIndex
CREATE INDEX "messages_senderType_senderPersonaId_idx" ON "messages"("senderType", "senderPersonaId");

-- CreateIndex
CREATE INDEX "messages_receiverType_receiverPersonaId_idx" ON "messages"("receiverType", "receiverPersonaId");

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_senderPersonaId_fkey" FOREIGN KEY ("senderPersonaId") REFERENCES "personas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_senderHostId_fkey" FOREIGN KEY ("senderHostId") REFERENCES "hosts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_receiverPersonaId_fkey" FOREIGN KEY ("receiverPersonaId") REFERENCES "personas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_receiverHostId_fkey" FOREIGN KEY ("receiverHostId") REFERENCES "hosts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
