-- Ajout du champ invoiceUrl sur les réservations (facture PDF générée à la confirmation)
ALTER TABLE "bookings" ADD COLUMN "invoiceUrl" TEXT;
