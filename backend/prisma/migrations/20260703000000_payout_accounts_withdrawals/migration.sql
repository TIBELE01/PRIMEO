-- Coordonnées de versement des professionnels et demandes de versement.

CREATE TABLE IF NOT EXISTS "payout_accounts" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "method" TEXT NOT NULL,
  "holderName" TEXT NOT NULL,
  "accountNumber" TEXT NOT NULL,
  "bankName" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "payout_accounts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "payout_accounts_userId_key" ON "payout_accounts"("userId");
DO $$ BEGIN
  ALTER TABLE "payout_accounts" ADD CONSTRAINT "payout_accounts_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "withdrawal_requests" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "method" TEXT NOT NULL,
  "holderName" TEXT NOT NULL,
  "accountNumber" TEXT NOT NULL,
  "bankName" TEXT,
  "reference" TEXT,
  "rejectionReason" TEXT,
  "processedById" TEXT,
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "withdrawal_requests_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "withdrawal_requests_userId_idx" ON "withdrawal_requests"("userId");
CREATE INDEX IF NOT EXISTS "withdrawal_requests_status_idx" ON "withdrawal_requests"("status");
DO $$ BEGIN
  ALTER TABLE "withdrawal_requests" ADD CONSTRAINT "withdrawal_requests_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
