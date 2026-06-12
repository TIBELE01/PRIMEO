-- Reversements automatiques aux professionnels : table `payouts` + enum statut.
-- Idempotente pour un `prisma migrate deploy` sûr (réexécution sans effet de bord).

DO $$ BEGIN
  CREATE TYPE "PayoutStatus" AS ENUM ('completed', 'failed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "payouts" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "grossAmount" INTEGER NOT NULL,
    "feeAmount" INTEGER NOT NULL DEFAULT 0,
    "netAmount" INTEGER NOT NULL,
    "feePercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "status" "PayoutStatus" NOT NULL DEFAULT 'completed',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payouts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "payouts_bookingId_key" ON "payouts"("bookingId");
CREATE INDEX IF NOT EXISTS "payouts_professionalId_createdAt_idx" ON "payouts"("professionalId", "createdAt");

DO $$ BEGIN
  ALTER TABLE "payouts" ADD CONSTRAINT "payouts_professionalId_fkey"
    FOREIGN KEY ("professionalId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "payouts" ADD CONSTRAINT "payouts_bookingId_fkey"
    FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
