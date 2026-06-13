-- Publications supplémentaires achetées (500 FCFA/slot/mois) ajoutées à la limite.
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "extraPublicationSlots" INTEGER NOT NULL DEFAULT 0;
