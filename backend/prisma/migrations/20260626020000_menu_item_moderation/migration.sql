-- Modération des plats (validation admin avant visibilité client), comme les propriétés.
DO $$ BEGIN
  CREATE TYPE "MenuItemStatus" AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "restaurant_menu_items"
  ADD COLUMN IF NOT EXISTS "status" "MenuItemStatus" NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT;

CREATE INDEX IF NOT EXISTS "restaurant_menu_items_status_idx" ON "restaurant_menu_items"("status");
