-- Type de média exclusif par bien : photos | video | threed.
-- Règle de migration MVP (priorité) : visite 3D > vidéo > photos.
-- Les médias excédentaires (non conformes au type retenu) sont supprimés.
-- Idempotente pour un `prisma migrate deploy` sûr.

DO $$ BEGIN
  CREATE TYPE "PropertyMediaChoice" AS ENUM ('photos', 'video', 'threed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE "properties"
  ADD COLUMN IF NOT EXISTS "media_type" "PropertyMediaChoice" NOT NULL DEFAULT 'photos';

-- 1) Biens avec visite 3D → threed
UPDATE "properties" p SET "media_type" = 'threed'
WHERE EXISTS (SELECT 1 FROM "property_3d_scenes" s WHERE s."propertyId" = p."id");

-- 2) Biens avec vidéo (sans 3D) → video
UPDATE "properties" p SET "media_type" = 'video'
WHERE p."media_type" = 'photos'
  AND EXISTS (SELECT 1 FROM "property_media" m WHERE m."propertyId" = p."id" AND m."mediaType" = 'video');

-- 3) Purge des médias non conformes au type retenu
-- threed : on supprime photos et vidéos (les scènes 3D vivent dans property_3d_scenes)
DELETE FROM "property_media" m
USING "properties" p
WHERE m."propertyId" = p."id" AND p."media_type" = 'threed';

-- video : on supprime les photos, on ne garde que la vidéo (1 max)
DELETE FROM "property_media" m
USING "properties" p
WHERE m."propertyId" = p."id" AND p."media_type" = 'video' AND m."mediaType" <> 'video';

-- photos : on supprime les éventuelles lignes video/360 orphelines
DELETE FROM "property_media" m
USING "properties" p
WHERE m."propertyId" = p."id" AND p."media_type" = 'photos' AND m."mediaType" <> 'photo';

-- Cohérence du flag hasVirtualTour avec le type exclusif
UPDATE "properties" SET "hasVirtualTour" = ("media_type" = 'threed');
