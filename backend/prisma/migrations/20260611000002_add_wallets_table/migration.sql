-- Portefeuille virtuel : table `wallets` comme source de vérité du solde de crédits.
-- Idempotente pour permettre un `prisma migrate deploy` sûr même si appliquée hors-bande.

CREATE TABLE IF NOT EXISTS "wallets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'XOF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "wallets_userId_key" ON "wallets"("userId");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'wallets_userId_fkey'
    ) THEN
        ALTER TABLE "wallets"
            ADD CONSTRAINT "wallets_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "users"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Backfill : une ligne wallet par utilisateur, initialisée avec le walletBalance hérité.
INSERT INTO "wallets" ("id", "userId", "balance", "currency", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, u."id", u."walletBalance", 'XOF', NOW(), NOW()
FROM "users" u
WHERE NOT EXISTS (SELECT 1 FROM "wallets" w WHERE w."userId" = u."id");
