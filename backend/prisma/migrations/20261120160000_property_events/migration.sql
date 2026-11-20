-- Événements de performance des annonces (onglet « Statistiques » du professionnel)
CREATE TYPE "PropertyEventType" AS ENUM ('view', 'click', 'booking_attempt');

CREATE TABLE "property_events" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "type" "PropertyEventType" NOT NULL,
    "visitorKey" TEXT,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "property_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "property_events_propertyId_type_createdAt_idx" ON "property_events"("propertyId", "type", "createdAt");
CREATE INDEX "property_events_visitorKey_propertyId_type_createdAt_idx" ON "property_events"("visitorKey", "propertyId", "type", "createdAt");

ALTER TABLE "property_events" ADD CONSTRAINT "property_events_propertyId_fkey"
  FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
