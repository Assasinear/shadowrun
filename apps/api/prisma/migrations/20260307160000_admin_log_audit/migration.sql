-- Add before/after audit columns to admin_logs
ALTER TABLE "admin_logs" ADD COLUMN "beforeJson" JSONB;
ALTER TABLE "admin_logs" ADD COLUMN "afterJson" JSONB;
