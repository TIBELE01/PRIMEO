-- Export de données professionnel : table `data_exports` + enums associés.
-- Idempotente pour un `prisma migrate deploy` sûr.

DO $$ BEGIN
  CREATE TYPE "ExportType" AS ENUM ('bookings', 'properties', 'transactions', 'advanced_stats');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "ExportFormat" AS ENUM ('csv', 'pdf');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "ExportStatus" AS ENUM ('pending', 'processing', 'ready', 'failed', 'expired');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "data_exports" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ExportType" NOT NULL,
    "format" "ExportFormat" NOT NULL,
    "status" "ExportStatus" NOT NULL DEFAULT 'pending',
    "periodFrom" TIMESTAMP(3),
    "periodTo" TIMESTAMP(3),
    "fileUrl" TEXT,
    "filePublicId" TEXT,
    "rowCount" INTEGER,
    "error" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "data_exports_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "data_exports_userId_createdAt_idx" ON "data_exports"("userId", "createdAt");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'data_exports_userId_fkey') THEN
    ALTER TABLE "data_exports" ADD CONSTRAINT "data_exports_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
