-- Convert DeviceType enum column to plain text
ALTER TABLE "devices" ALTER COLUMN "type" TYPE TEXT;

-- Set default value
ALTER TABLE "devices" ALTER COLUMN "type" SET DEFAULT 'COMMLINK';

-- Drop the enum type (it's no longer used)
DROP TYPE IF EXISTS "DeviceType";
