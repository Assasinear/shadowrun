-- AlterTable: add admin fields to users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "isBlocked" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "totpSecret" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is2faEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable: admin_logs
CREATE TABLE IF NOT EXISTS "admin_logs" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable: system_settings
CREATE TABLE IF NOT EXISTS "system_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "admin_logs_adminUserId_createdAt_idx" ON "admin_logs"("adminUserId", "createdAt");
CREATE INDEX IF NOT EXISTS "admin_logs_action_createdAt_idx" ON "admin_logs"("action", "createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "system_settings_key_key" ON "system_settings"("key");
