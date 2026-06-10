-- Le téléphone devient optionnel : les comptes clients créés via Google OAuth
-- n'ont pas de numéro de téléphone (pas de vérification OTP pour les clients).
ALTER TABLE "users" ALTER COLUMN "phone" DROP NOT NULL;
