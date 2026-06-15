-- ============================================================================
-- Primeo — Nettoyage des données de test (AVANT MISE EN PRODUCTION)
-- ----------------------------------------------------------------------------
-- ⚠️  NE SUPPRIME RIEN SANS VALIDATION.
--     Ce script est encapsulé dans une transaction qui se TERMINE PAR `ROLLBACK`.
--     1. Exécutez-le tel quel → il affiche ce QUI SERAIT supprimé (aperçu),
--        puis annule tout (ROLLBACK).
--     2. Vérifiez les comptes/biens listés dans l'aperçu (section 2).
--     3. Quand vous êtes sûr, remplacez le `ROLLBACK;` final par `COMMIT;`
--        et ré-exécutez pour appliquer.
--
-- Convention DB : tables en snake_case (users, properties…), colonnes en
-- camelCase entre guillemets ("userId", "ownerId"…).
--
-- Exécution :
--   psql "$DIRECT_URL" -f scripts/cleanup-test-data.sql
--   (ou via le SQL Editor Supabase — coller le contenu)
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. CRITÈRES DE CIBLAGE  (à adapter avant exécution)
-- ----------------------------------------------------------------------------
-- Sélectionne les comptes considérés comme "de test". Par défaut :
--   • email contenant test / demo / seed / example / placeholder
--   • OU comptes créés après une date seuil (désactivée par défaut)
-- L'admin réel (admin@primeo.ci) est explicitement PROTÉGÉ.
-- Ajoutez vos propres emails réels dans la liste de protection si besoin.

CREATE TEMP TABLE tmp_users ON COMMIT DROP AS
SELECT id, email
FROM users
WHERE (
        email ILIKE '%test%'
     OR email ILIKE '%demo%'
     OR email ILIKE '%seed%'
     OR email ILIKE '%example%'
     OR email ILIKE '%placeholder%'
     -- Décommentez pour cibler aussi par date de création :
     -- OR "createdAt" >= TIMESTAMP '2026-06-01 00:00:00'
      )
  -- Garde-fous : ne jamais toucher aux comptes réels connus
  AND email NOT IN (
        'admin@primeo.ci'
        -- , 'votre.vrai.compte@domaine.ci'
      );

-- Biens appartenant aux comptes de test
CREATE TEMP TABLE tmp_props ON COMMIT DROP AS
SELECT id FROM properties WHERE "ownerId" IN (SELECT id FROM tmp_users);

-- Réservations liées (client de test OU bien de test)
CREATE TEMP TABLE tmp_bookings ON COMMIT DROP AS
SELECT id FROM bookings
WHERE "clientId" IN (SELECT id FROM tmp_users)
   OR "propertyId" IN (SELECT id FROM tmp_props);

-- ----------------------------------------------------------------------------
-- 2. APERÇU  (ce qui serait supprimé) — VÉRIFIEZ avant de COMMIT
-- ----------------------------------------------------------------------------
\echo '=== Comptes de test ciblés ==='
SELECT email FROM tmp_users ORDER BY email;
\echo '=== Décompte ==='
SELECT
  (SELECT count(*) FROM tmp_users)    AS users_cibles,
  (SELECT count(*) FROM tmp_props)    AS biens_cibles,
  (SELECT count(*) FROM tmp_bookings) AS reservations_cibles;

-- ----------------------------------------------------------------------------
-- 3. SUPPRESSION  (enfants → parents, intégrité référentielle respectée)
-- ----------------------------------------------------------------------------
-- Les relations onDelete: Cascade (professional_profiles, subscriptions,
-- favorites, favorite_lists, notifications, push_tokens, data_exports, wallets,
-- message_templates, professional_guests, property_media, property_3d_scenes,
-- availabilities, property_ical_feeds, review_media, food_order_items) sont
-- supprimées AUTOMATIQUEMENT par la base. Les relations onDelete: SetNull
-- (audit_logs."userId", promo_codes."createdBy", referrals."refereeId") sont
-- mises à NULL automatiquement. On supprime ici uniquement les relations
-- onDelete: Restrict, qui bloqueraient sinon la suppression.

-- 3.1 Commandes restaurant (Restrict sur clientId/propertyId)
DELETE FROM food_order_items
 WHERE "orderId" IN (SELECT id FROM food_orders
                     WHERE "propertyId" IN (SELECT id FROM tmp_props)
                        OR "clientId"  IN (SELECT id FROM tmp_users));
DELETE FROM food_orders
 WHERE "propertyId" IN (SELECT id FROM tmp_props)
    OR "clientId"  IN (SELECT id FROM tmp_users);

-- 3.2 Enfants des réservations (Restrict sur bookingId)
DELETE FROM payouts
 WHERE "bookingId" IN (SELECT id FROM tmp_bookings)
    OR "professionalId" IN (SELECT id FROM tmp_users);
DELETE FROM client_ratings
 WHERE "bookingId" IN (SELECT id FROM tmp_bookings)
    OR "ratedUserId" IN (SELECT id FROM tmp_users)
    OR "raterUserId" IN (SELECT id FROM tmp_users);
DELETE FROM disputes
 WHERE "bookingId" IN (SELECT id FROM tmp_bookings)
    OR "openedBy"  IN (SELECT id FROM tmp_users);
DELETE FROM review_media
 WHERE "reviewId" IN (SELECT id FROM reviews
                      WHERE "bookingId" IN (SELECT id FROM tmp_bookings)
                         OR "propertyId" IN (SELECT id FROM tmp_props)
                         OR "authorId"  IN (SELECT id FROM tmp_users));
DELETE FROM reviews
 WHERE "bookingId" IN (SELECT id FROM tmp_bookings)
    OR "propertyId" IN (SELECT id FROM tmp_props)
    OR "authorId"  IN (SELECT id FROM tmp_users);
DELETE FROM transactions
 WHERE "bookingId" IN (SELECT id FROM tmp_bookings)
    OR "userId"    IN (SELECT id FROM tmp_users);
DELETE FROM messages
 WHERE "bookingId" IN (SELECT id FROM tmp_bookings)
    OR "senderId"  IN (SELECT id FROM tmp_users)
    OR "receiverId" IN (SELECT id FROM tmp_users);

-- 3.3 Réservations
DELETE FROM bookings WHERE id IN (SELECT id FROM tmp_bookings);

-- 3.4 Enfants des biens encore en Restrict, puis les biens
DELETE FROM boosts
 WHERE "propertyId" IN (SELECT id FROM tmp_props)
    OR "userId"     IN (SELECT id FROM tmp_users);
DELETE FROM properties WHERE id IN (SELECT id FROM tmp_props);

-- 3.5 Relations utilisateur directes en Restrict
DELETE FROM referrals
 WHERE "referrerId" IN (SELECT id FROM tmp_users)
    OR "refereeId"  IN (SELECT id FROM tmp_users);
DELETE FROM ticket_comments
 WHERE "authorId" IN (SELECT id FROM tmp_users)
    OR "ticketId" IN (SELECT id FROM support_tickets
                      WHERE "userId" IN (SELECT id FROM tmp_users));
DELETE FROM support_tickets WHERE "userId" IN (SELECT id FROM tmp_users);

-- 3.6 Enfin, les comptes (cascade le reste : profils, abos, favoris, wallets…)
DELETE FROM users WHERE id IN (SELECT id FROM tmp_users);

-- ----------------------------------------------------------------------------
-- 4. VÉRIFICATION  (comptes réels restants)
-- ----------------------------------------------------------------------------
\echo '=== Comptes restants par type ==='
SELECT "accountType", count(*) AS total
FROM users
GROUP BY "accountType"
ORDER BY "accountType";
\echo '=== Détail des comptes restants (email + type) ==='
SELECT email, "accountType", "createdAt"
FROM users
ORDER BY "createdAt";

-- ----------------------------------------------------------------------------
-- 5. APPLICATION
-- ----------------------------------------------------------------------------
-- Tant que la ligne ci-dessous est `ROLLBACK;`, AUCUNE suppression n'est
-- persistée (le script ne fait qu'un aperçu). Pour appliquer réellement :
--   → remplacez `ROLLBACK;` par `COMMIT;` puis ré-exécutez.
ROLLBACK;
-- COMMIT;

-- ============================================================================
-- 6. (OPTIONNEL) BOOTSTRAP si AUCUN compte réel ne subsiste
-- ----------------------------------------------------------------------------
-- Si la section 4 montre 0 utilisateur, créez l'admin via le canal applicatif
-- (recommandé : il synchronise Supabase Auth + le mot de passe haché) :
--
--   cd backend && ADMIN_EMAIL=admin@primeo.ci ADMIN_PASSWORD='<motDePasseFort>' \
--     ALLOW_DEV_ADMIN_SEED=true npx ts-node prisma/seed.ts
--
-- N'INSÉREZ PAS d'admin directement en SQL : le mot de passe est géré par
-- Supabase Auth, pas dans la table `users`. Un INSERT manuel créerait un
-- compte sans identifiants de connexion valides.
-- ============================================================================
