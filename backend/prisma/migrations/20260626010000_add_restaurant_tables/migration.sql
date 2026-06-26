-- Tables de restaurant (gestion de salle : couverts, emplacement).
CREATE TABLE IF NOT EXISTS "restaurant_tables" (
  "id" TEXT NOT NULL,
  "propertyId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "seats" INTEGER NOT NULL,
  "location" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "restaurant_tables_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "restaurant_tables_propertyId_idx" ON "restaurant_tables"("propertyId");

DO $$ BEGIN
  ALTER TABLE "restaurant_tables" ADD CONSTRAINT "restaurant_tables_propertyId_fkey"
    FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
