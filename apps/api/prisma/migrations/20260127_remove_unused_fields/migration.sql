-- DropForeignKey
-- subscriptions.payerId and payeeId are polymorphic (can reference personas OR hosts),
-- so FK constraints pointing only to personas are incorrect and cause 500 errors
-- when creating subscriptions with HOST payers/payees.
ALTER TABLE "subscriptions" DROP CONSTRAINT IF EXISTS "subscriptions_payerId_fkey";

-- DropForeignKey
ALTER TABLE "subscriptions" DROP CONSTRAINT IF EXISTS "subscriptions_payeeId_fkey";
