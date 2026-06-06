-- Champs spécifiques immobilier
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "floor"              INTEGER;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "yearBuilt"          INTEGER;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "availabilityDate"   TIMESTAMP(3);
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "diagnostics"        JSONB;

-- Types de chambres hôtel
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "roomTypes"          JSONB;
