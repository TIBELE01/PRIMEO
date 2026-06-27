-- Réservation de tables activable par restaurant (désactivée par défaut).
ALTER TABLE "properties"
  ADD COLUMN IF NOT EXISTS "tableReservationEnabled" BOOLEAN NOT NULL DEFAULT false;
