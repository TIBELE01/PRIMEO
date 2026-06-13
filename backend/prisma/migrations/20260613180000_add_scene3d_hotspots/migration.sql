-- Hotspots de navigation inter-pièces pour la visite 3D (JSON par scène).
ALTER TABLE "property_3d_scenes" ADD COLUMN IF NOT EXISTS "hotspots" JSONB;
