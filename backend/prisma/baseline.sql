-- ─────────────────────────────────────────────────────────────────────────────
-- BASELINE PRISMA MIGRATE — adoption des migrations versionnées sur base existante
-- ─────────────────────────────────────────────────────────────────────────────
-- Contexte : la production utilisait `prisma db push` (aucune table
-- _prisma_migrations). Ce script crée la table de suivi et marque comme
-- « appliquées » les migrations déjà reflétées par le schéma de production.
--
-- ⚠️ MÉTADONNÉES UNIQUEMENT — n'altère AUCUNE donnée applicative.
-- Idempotent : peut être ré-exécuté sans effet de bord.
--
-- IMPORTANT : la migration 20260606000003_restaurant_review_criteria_and_immo_available_from
-- N'EST PAS baselinée car les colonnes reviews.cuisineRating / serviceRating /
-- ambianceRating manquaient en production (dérive db push). Elle reste « pending »
-- pour que `prisma migrate deploy` l'applique (idempotente, IF NOT EXISTS) et
-- répare ainsi la dérive au prochain déploiement.
--
-- Procédure officielle équivalente (à privilégier si la CLI a accès à la base) :
--   for m in <chaque migration ci-dessous>; do npx prisma migrate resolve --applied "$m"; done
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
  "id"                  VARCHAR(36)  NOT NULL,
  "checksum"            VARCHAR(64)  NOT NULL,
  "finished_at"         TIMESTAMPTZ,
  "migration_name"      VARCHAR(255) NOT NULL,
  "logs"                TEXT,
  "rolled_back_at"      TIMESTAMPTZ,
  "started_at"          TIMESTAMPTZ  NOT NULL DEFAULT now(),
  "applied_steps_count" INTEGER      NOT NULL DEFAULT 0,
  CONSTRAINT "_prisma_migrations_pkey" PRIMARY KEY ("id")
);

DO $$
DECLARE
  baseline TEXT[][] := ARRAY[
    ['20260524000000_initial_schema','bd788c6dc73bf9053f7eb709090958ad6706abca5205f4d07db57d71864a047f'],
    ['20260524000001_notification_preferences','5edb1d2592ba10696020600a72cdd8d5bdd8a574282b587ce80e0446e8cfd2e5'],
    ['20260524000002_client_rating_report','91cd5b19dbfa0bf8e790426de73709653fef809db313e5acd480f4a82441f57d'],
    ['20260524000003_support_ticket_attachments','c96bb5f29e0726ae41e0796320afbd4a1704b17440d5cecb67f5014c5369fdec'],
    ['20260528000000_website_solutions_page','8d1d51a2513c2a40784b1d95d61dfc8308b9861e4376d3ca403eaaaf7651d827'],
    ['20260528000001_products_page','610acdfe3d9bd0796cd03f42e0fa41074cf535692736ca48f8f04075f3684cf8'],
    ['20260528000002_careers_models','5adcf0b56f3c14349d03a0ccd62e41f1f8a82815a26f193fa5c0561ea7b60907'],
    ['20260603000000_restaurant_slots_menus_promos','8aaa8daeff70343de5adf6bd2d52d18c299ae0e87245459c41f6022d4df56659'],
    ['20260603000001_booking_invoice_url','c909156b9f6af886836ac4720db5571e6d981fc411c2ffa0732f1d745bf7e0f7'],
    ['20260603000002_add_professional_hotel','1b1bf61386f5801f01c2784cb20816accce756f15a8c50019dadb53039a07aa5'],
    ['20260604000000_property_media_publicid_and_rejected_status','b07d77f4a08ae384bded7417742cf4987c11658a02ca5f612f0b9b44a5aa13fe'],
    ['20260605000000_food_orders','f331fdf6ac1192316875aab4cbdca8f9af4aeb8cb8b411144bde7bf85adf9685'],
    ['20260605000002_add_push_tokens','5caee9dc976f045585d4516a4d4a478b44b5119eb6b87c50bde8848d263cabc4'],
    ['20260605000003_email_logs_and_bounce','1df30f0082716d8e08a9b3fb4591b876766c9e86573c86c6002254bb1349d7a7'],
    ['20260605000004_sms_logs','2ddd6f9961464c9958117a3bd14b8b4ecd29d37683cfa3e9a3999554e562516c'],
    ['20260605000005_feature_flags','6528df09438dff9b3a3d378e7380cf51cb944ca1480fa01dc22f6cc6a1c71e15'],
    ['20260605000006_new_subscription_plans','6b1ce0cd65f990738656d956dca7e487ce55ca3b8e8abbb1530b417f63d27a4d'],
    ['20260606000000_add_deactivated_until','5646379057a8c3f100e8fda10f230bd895a5afca2e8e9ea94d02ffaec60f01e6'],
    ['20260606000001_add_interest_expressed_booking_status','a2bcbe2d1074636d9dd23cd8d214af35c7479d8066497dc11069705fe28331b1'],
    ['20260606000002_property_type_specific_fields','ac1df95b4c72582033bec7d763bdffc797b9108a20739f55f2f6d2a6fe82fd9c']
  ];
  i INT;
BEGIN
  FOR i IN 1 .. array_length(baseline, 1) LOOP
    IF NOT EXISTS (SELECT 1 FROM "_prisma_migrations" WHERE migration_name = baseline[i][1]) THEN
      INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, started_at, applied_steps_count)
      VALUES (gen_random_uuid()::text, baseline[i][2], now(), baseline[i][1], now(), 1);
    END IF;
  END LOOP;
END $$;
