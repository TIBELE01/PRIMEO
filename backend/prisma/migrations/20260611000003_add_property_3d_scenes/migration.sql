-- Visite 3D immersive : table `property_3d_scenes` pour les photos panoramiques
-- équirectangulaires (360°). Une scène = une pièce nommée (Salon, Chambre…).
-- Idempotente pour permettre un `prisma migrate deploy` sûr même si appliquée hors-bande.

CREATE TABLE IF NOT EXISTS "property_3d_scenes" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "roomName" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "publicId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "property_3d_scenes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "property_3d_scenes_propertyId_idx" ON "property_3d_scenes"("propertyId");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'property_3d_scenes_propertyId_fkey'
    ) THEN
        ALTER TABLE "property_3d_scenes"
            ADD CONSTRAINT "property_3d_scenes_propertyId_fkey"
            FOREIGN KEY ("propertyId") REFERENCES "properties"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Reprise de l'existant : les médias virtual_tour_360 déjà uploadés deviennent
-- des scènes 3D (nom de pièce générique, renommable ensuite par le pro).
INSERT INTO "property_3d_scenes" ("id", "propertyId", "roomName", "url", "publicId", "sortOrder", "uploadedAt")
SELECT
    'scene-' || pm."id",
    pm."propertyId",
    'Pièce ' || (ROW_NUMBER() OVER (PARTITION BY pm."propertyId" ORDER BY pm."sortOrder"))::TEXT,
    pm."url",
    pm."publicId",
    pm."sortOrder",
    pm."uploadedAt"
FROM "property_media" pm
WHERE pm."mediaType" = 'virtual_tour_360'
ON CONFLICT ("id") DO NOTHING;

-- Cohérence du flag hasVirtualTour avec les scènes existantes
UPDATE "properties" p
SET "hasVirtualTour" = TRUE
WHERE EXISTS (SELECT 1 FROM "property_3d_scenes" s WHERE s."propertyId" = p."id");
