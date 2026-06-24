-- ============================================================================
-- PRIMEO — Purge des données de DÉMO / TEST avant passage en production
-- ----------------------------------------------------------------------------
-- À exécuter dans le SQL Editor Supabase (rôle `postgres`) APRÈS validation.
-- NON destructif tant qu'il n'est pas lancé manuellement.
--
-- CONSERVE :
--   • le compte admin (support.primeo@gmail.com)
--   • le contenu vitrine  : website_*, about_*, careers_*, blog_*, faqs
--   • la configuration    : platform_config, feature_flags, currency_rates, products_*
--
-- SUPPRIME :
--   • les 6 comptes de test (tibeleyeo*) — côté public ET côté Supabase Auth
--   • le catalogue de démo (120 propriétés + médias + 3D + disponibilités + menus)
--   • toute l'activité de test (réservations, transactions, messages, notifications…)
--
-- NB : `session_replication_role = replica` désactive temporairement les FK et les
--      triggers (dont l'immuabilité des journaux) → suppression robuste, ordre libre.
-- ============================================================================
BEGIN;

SET session_replication_role = replica;

-- 1) Activité transactionnelle (100 % démo)
DELETE FROM review_media;
DELETE FROM reviews;
DELETE FROM food_order_items;
DELETE FROM food_orders;
DELETE FROM messages;
DELETE FROM disputes;
DELETE FROM notifications;
DELETE FROM payouts;
DELETE FROM transactions;
DELETE FROM boosts;
DELETE FROM client_ratings;
DELETE FROM favorite_list_items;
DELETE FROM favorite_lists;
DELETE FROM favorites;
DELETE FROM bookings;

-- 2) Catalogue (propriétés + dépendances + spécifique restauration)
DELETE FROM availabilities;
DELETE FROM property_media;
DELETE FROM property_3d_scenes;
DELETE FROM property_ical_feeds;
DELETE FROM restaurant_menu_items;
DELETE FROM restaurant_time_slots;
DELETE FROM restaurant_special_menus;
DELETE FROM restaurant_promotions;
DELETE FROM message_templates;
DELETE FROM properties;

-- 3) Profils pro / abonnements / portefeuilles (on garde ceux de l'admin)
DELETE FROM professional_documents;
DELETE FROM professional_guests;
DELETE FROM professional_profiles;
DELETE FROM referrals;
DELETE FROM subscriptions WHERE "userId" <> (SELECT id FROM users WHERE email = 'support.primeo@gmail.com');
DELETE FROM wallets       WHERE "userId" <> (SELECT id FROM users WHERE email = 'support.primeo@gmail.com');
DELETE FROM push_tokens;
DELETE FROM data_exports;

-- 4) Journaux techniques de test — OPTIONNEL (décommenter pour repartir vierge)
-- DELETE FROM email_logs;
-- DELETE FROM sms_logs;
-- DELETE FROM app_events;
-- DELETE FROM audit_logs;

-- 5) Comptes de test — profil applicatif (tout sauf l'admin)
DELETE FROM users WHERE email <> 'support.primeo@gmail.com';

-- 6) Comptes de test — Supabase Auth (sinon les comptes resteraient connectables)
DELETE FROM auth.users WHERE email <> 'support.primeo@gmail.com';

SET session_replication_role = DEFAULT;

-- 7) Vérification (doit afficher : 1 user, 0 propriété, 0 réservation)
SELECT
  (SELECT count(*) FROM users)        AS users_restants,
  (SELECT count(*) FROM auth.users)   AS auth_users_restants,
  (SELECT count(*) FROM properties)   AS proprietes,
  (SELECT count(*) FROM bookings)     AS reservations,
  (SELECT count(*) FROM transactions) AS transactions;

-- ⚠️ Vérifie le résultat ci-dessus AVANT de valider.
-- COMMIT;   -- ← décommente pour appliquer
-- ROLLBACK; -- ← (par défaut) annule tant que tu n'as pas validé
ROLLBACK;
