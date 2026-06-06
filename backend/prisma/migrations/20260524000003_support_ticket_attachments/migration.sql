-- Add attachments and resolution timestamps to support_tickets
ALTER TABLE "support_tickets"
  ADD COLUMN IF NOT EXISTS "attachments" TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "resolvedAt" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "closedAt" TIMESTAMPTZ;
