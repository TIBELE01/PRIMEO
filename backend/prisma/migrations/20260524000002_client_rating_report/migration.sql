-- Add report fields to client_ratings table
ALTER TABLE "client_ratings"
  ADD COLUMN IF NOT EXISTS "isReported" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "reportReason" TEXT;
