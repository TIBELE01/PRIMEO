-- Trace sur la réservation ce qui a été prélevé à sa création, afin de pouvoir
-- le restituer si le paiement échoue, expire, ou si la réservation est annulée :
--   walletDeduction : montant (FCFA) débité du portefeuille du client ;
--   promoCodeId     : code promo dont une utilisation a été consommée.
-- Sans ces colonnes, le crédit portefeuille et l'utilisation du code promo
-- étaient perdus à chaque paiement non abouti.
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "walletDeduction" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "promoCodeId" TEXT;
