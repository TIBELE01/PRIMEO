-- iCal externe + réponses rapides messagerie.
ALTER TYPE "AvailabilityStatus" ADD VALUE IF NOT EXISTS 'external_blocked';

CREATE TABLE IF NOT EXISTS "property_ical_feeds" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'autre',
    "lastSyncedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "property_ical_feeds_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "property_ical_feeds_propertyId_idx" ON "property_ical_feeds"("propertyId");
DO $$ BEGIN
  ALTER TABLE "property_ical_feeds" ADD CONSTRAINT "property_ical_feeds_propertyId_fkey"
    FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "message_templates" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "message_templates_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "message_templates_userId_sortOrder_idx" ON "message_templates"("userId", "sortOrder");
DO $$ BEGIN
  ALTER TABLE "message_templates" ADD CONSTRAINT "message_templates_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
