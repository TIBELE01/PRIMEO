-- Champs spécifiques immobilier
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "floor"              INTEGER;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "year_built"         INTEGER;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "availability_date"  TIMESTAMP(3);
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "diagnostics"        JSONB;

-- Types de chambres hôtel
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "room_types"         JSONB;
