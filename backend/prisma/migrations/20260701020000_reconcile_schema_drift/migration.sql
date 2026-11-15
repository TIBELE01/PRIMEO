-- Réconciliation : écarts constatés entre la base de production (Supabase) et
-- schema.prisma. Toutes les instructions sont idempotentes — sans effet sur une
-- base déjà conforme.

-- 1. review_media.publicId : présent dans schema.prisma et utilisé par le code
--    (suppression du fichier Cloudinary d'un avis), mais jamais créé par une
--    migration. Sans cette colonne, toute requête Prisma sur review_media échoue
--    (« column does not exist ») : ajout, lecture et suppression de photos d'avis.
ALTER TABLE "review_media" ADD COLUMN IF NOT EXISTS "publicId" TEXT;

-- 2. referrals.referralCode : l'unicité devait être supprimée par la migration
--    20260624000000, mais celle-ci faisait DROP CONSTRAINT alors que l'unicité
--    est portée par un INDEX : elle n'a rien supprimé. Tant que cet index existe,
--    un parrain ne peut avoir qu'UN seul filleul (le code du parrain est partagé
--    par tous ses filleuls) — le 2e est rejeté pour violation d'unicité.
ALTER TABLE "referrals" DROP CONSTRAINT IF EXISTS "referrals_referralCode_key";
DROP INDEX IF EXISTS "referrals_referralCode_key";

-- 3. referrals.rewardAmount : valeur par défaut 2000 en base, 0 dans le schéma.
--    Un parrainage en attente affichait donc 2000 FCFA de récompense avant même
--    d'être gagné ; le montant réel est fixé par le code au moment du versement.
ALTER TABLE "referrals" ALTER COLUMN "rewardAmount" SET DEFAULT 0;
UPDATE "referrals" SET "rewardAmount" = 0 WHERE "status" <> 'rewarded' AND "rewardAmount" <> 0;

-- 4. support_tickets.resolvedAt / closedAt : créées en « timestamptz » hors
--    Prisma, alors que le schéma (comme toutes les autres dates) attend
--    « timestamp(3) » en UTC. Conversion sans perte : l'instant UTC est conservé.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'support_tickets'
      AND column_name = 'resolvedAt' AND data_type = 'timestamp with time zone'
  ) THEN
    ALTER TABLE "support_tickets"
      ALTER COLUMN "resolvedAt" TYPE TIMESTAMP(3) USING ("resolvedAt" AT TIME ZONE 'UTC');
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'support_tickets'
      AND column_name = 'closedAt' AND data_type = 'timestamp with time zone'
  ) THEN
    ALTER TABLE "support_tickets"
      ALTER COLUMN "closedAt" TYPE TIMESTAMP(3) USING ("closedAt" AT TIME ZONE 'UTC');
  END IF;
END $$;
