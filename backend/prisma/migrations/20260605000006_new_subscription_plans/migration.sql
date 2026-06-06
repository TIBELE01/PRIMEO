-- Migration : remplacement des formules Essentiel/Prestige/Premium/Restaurant
-- par Starter / Business / Entreprise (toutes à 0 % de commission)

-- Étape 1 : créer le nouveau type enum
CREATE TYPE "PlanType_new" AS ENUM ('starter', 'business', 'entreprise');

-- Étape 2 : migrer la colonne en conservant la correspondance des données
--   essentiel   → starter
--   prestige    → business
--   premium     → entreprise
--   restaurant  → starter
ALTER TABLE "subscriptions"
  ALTER COLUMN "planType" TYPE "PlanType_new"
  USING CASE "planType"::text
    WHEN 'essentiel'  THEN 'starter'::"PlanType_new"
    WHEN 'prestige'   THEN 'business'::"PlanType_new"
    WHEN 'premium'    THEN 'entreprise'::"PlanType_new"
    WHEN 'restaurant' THEN 'starter'::"PlanType_new"
    ELSE                   'starter'::"PlanType_new"
  END;

-- Étape 3 : supprimer l'ancien enum
DROP TYPE "PlanType";

-- Étape 4 : renommer le nouveau
ALTER TYPE "PlanType_new" RENAME TO "PlanType";

-- Étape 5 : mettre à jour les données métier pour les nouvelles formules
--   - commissionRate → 0 pour toutes
--   - includedPropertiesLimit → 3 / 10 / 40
--   - boostsFreeMonthly       → 0 / 2 / 7
--   - monthlyPrice            → 0 / 9000 / 24000
UPDATE "subscriptions"
SET
  "commissionRate"          = 0,
  "monthlyPrice"            = CASE "planType"::text
                                WHEN 'starter'    THEN 0
                                WHEN 'business'   THEN 9000
                                WHEN 'entreprise' THEN 24000
                                ELSE 0
                              END,
  "includedPropertiesLimit" = CASE "planType"::text
                                WHEN 'starter'    THEN 3
                                WHEN 'business'   THEN 10
                                WHEN 'entreprise' THEN 40
                                ELSE 3
                              END,
  "boostsFreeMonthly"       = CASE "planType"::text
                                WHEN 'starter'    THEN 0
                                WHEN 'business'   THEN 2
                                WHEN 'entreprise' THEN 7
                                ELSE 0
                              END;

-- Étape 6 : restaurateurs sur Entreprise → illimité (9999 menus)
UPDATE "subscriptions" s
SET "includedPropertiesLimit" = 9999
FROM "users" u
WHERE s."userId" = u.id
  AND u."accountType" = 'restaurateur'
  AND s."planType"::text = 'entreprise';

-- Étape 7 : effacer les pendingPlanType obsolètes du JSON features
UPDATE "subscriptions"
SET "features" = "features"::jsonb - 'pendingPlanType'
WHERE "features" IS NOT NULL
  AND "features"::jsonb ? 'pendingPlanType';

-- Étape 8 : renommer les colonnes du tableau comparatif vitrine
ALTER TABLE "products_subscription_rows" RENAME COLUMN "essential" TO "starter";
ALTER TABLE "products_subscription_rows" RENAME COLUMN "prestige"  TO "business";
ALTER TABLE "products_subscription_rows" RENAME COLUMN "premium"   TO "entreprise";
