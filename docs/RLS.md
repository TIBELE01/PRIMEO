# Modèle de sécurité Row Level Security (RLS) — Primeo

Dernière mise à jour : 2026-06-12

Ce document décrit la stratégie RLS de la base PostgreSQL gérée par Supabase
(projet `qaiplagtbnxvctvpofuh`) et justifie les choix de configuration. Il
constitue la référence d'audit demandée par l'advisor Supabase
`rls_enabled_no_policy`.

## 1. Principe : défense en profondeur, deny-by-default

L'accès aux données repose sur **deux couches** :

1. **Le backend Express/Prisma** se connecte à PostgreSQL via `DATABASE_URL` en
   tant que **propriétaire des tables** (rôle `postgres`). Ce rôle **contourne
   nativement la RLS** (table owner bypass). C'est la seule voie d'accès
   applicative aux données métier : le mobile et les sites passent tous par
   l'API backend, jamais par le client Supabase en lecture directe des tables
   `public.*`.
2. **Les rôles exposés par l'API Supabase** (`anon` pour les requêtes non
   authentifiées, `authenticated` pour les sessions Supabase Auth) sont, eux,
   **soumis à la RLS**. Sur Primeo, ces rôles ne servent qu'à l'authentification
   (schéma `auth`) et au stockage (`storage`), pas à la lecture directe des
   tables métier.

Conséquence : **RLS activée + aucune policy = aucun accès** pour `anon` /
`authenticated` (deny-all implicite), tandis que le backend continue de
fonctionner via le bypass propriétaire. C'est l'état de sécurité voulu.

## 2. Policies deny-all explicites

Bien que « RLS activée sans policy » soit déjà un deny-all, l'absence de policy
déclenche le lint `rls_enabled_no_policy` et nuit à la lisibilité de l'audit.
Une policy **deny-all explicite** a donc été ajoutée sur **toutes les tables
`public.*` qui avaient la RLS activée sans aucune policy** (66 tables) :

```sql
-- Idempotent : ne touche QUE les tables RLS sans policy existante.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.relname
    FROM pg_class c
    WHERE c.relnamespace = 'public'::regnamespace
      AND c.relkind = 'r'
      AND c.relrowsecurity = true
      AND NOT EXISTS (SELECT 1 FROM pg_policy p WHERE p.polrelid = c.oid)
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'deny_all_api_roles', r.relname);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I AS PERMISSIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false)',
      'deny_all_api_roles', r.relname
    );
  END LOOP;
END $$;
```

Caractéristiques :

- **Cible** : rôles `anon` et `authenticated` uniquement. Le rôle propriétaire
  (backend) n'est jamais visé → **aucun changement de comportement applicatif**.
- `USING (false)` et `WITH CHECK (false)` : aucune ligne lisible, aucune écriture
  acceptée pour ces rôles.
- Appliquée comme migration Supabase
  `explicit_deny_all_rls_unprotected_tables` (historique du projet Supabase).
- Réexécutable sans effet de bord (la clause `NOT EXISTS` ignore les tables déjà
  dotées d'une policy).

## 3. Tables avec policies fonctionnelles (NON modifiées)

Les tables suivantes possédaient déjà des policies RLS **intentionnelles** (accès
direct `anon`/`authenticated` requis, notamment par la fonctionnalité Communauté
anonyme et certains accès client). Elles n'ont **pas** été touchées par le
deny-all :

`availabilities`, `bookings`, `community_comments`, `community_likes`,
`community_posts`, `community_reports`, `favorite_list_items`, `favorite_lists`,
`favorites`, `messages`, `notifications`, `professional_profiles`, `properties`,
`property_media`, `review_media`, `reviews`, `support_tickets`, `transactions`,
`users`.

⚠️ Toute évolution de ces policies doit être faite en connaissance de cause : ce
sont les seuls points d'entrée RLS réellement « ouverts » de la base.

## 4. Stockage — bucket `property-media`

Le bucket est **public** (téléchargement des images via URL publique sans
authentification — nécessaire à l'affichage). La policy de lecture large
`Lecture publique property-media` (SELECT pour tous les rôles), qui permettait de
**lister** l'intégralité des fichiers, a été supprimée. Les buckets publics
n'ont pas besoin de cette policy pour servir les objets par URL.

Policies restantes sur `storage.objects` pour ce bucket :

- `Upload authentifié property-media` — INSERT, rôle `authenticated`.
- `Suppression propriétaire property-media` — DELETE, propriétaire du dossier
  (`auth.uid() = (storage.foldername(name))[1]`).

Résultat vérifié : `bucket.public = true`, objets toujours servis par URL
publique, **listing anonyme = 0 ligne** (bloqué).

## 5. Protection « mot de passe compromis » (Supabase Auth)

L'advisor `auth_leaked_password_protection` signale que la vérification contre
HaveIBeenPwned est désactivée. Ce réglage relève de **GoTrue (Supabase Auth)** et
**ne peut pas être modifié en SQL** ; il se règle via le dashboard ou la
Management API :

- **Dashboard** : *Authentication → Sign In / Providers → Password →* activer
  **« Leaked password protection »** (et idéalement un *Minimum password
  strength* élevé).
- **Management API** :
  ```bash
  curl -X PATCH "https://api.supabase.com/v1/projects/qaiplagtbnxvctvpofuh/config/auth" \
    -H "Authorization: Bearer <SUPABASE_ACCESS_TOKEN>" \
    -H "Content-Type: application/json" \
    -d '{ "password_hibp_enabled": true }'
  ```

Une fois activé, **tout nouveau mot de passe** (inscription, changement, reset)
est refusé s'il figure dans une fuite connue. S'appliquant côté GoTrue, la
mesure couvre automatiquement tous les comptes — l'inscription Primeo déléguant
déjà la création/maj de mot de passe à Supabase Auth (`supabaseAdmin.auth`).

## 6. Reproduire / vérifier

```sql
-- Tables RLS sans aucune policy (doit valoir 0)
SELECT count(*) FROM pg_class c
WHERE c.relnamespace='public'::regnamespace AND c.relkind='r'
  AND c.relrowsecurity=true
  AND NOT EXISTS (SELECT 1 FROM pg_policy p WHERE p.polrelid=c.oid);

-- Vérifier qu'un rôle anonyme ne lit rien d'une table deny-all
SET ROLE anon;
SELECT count(*) FROM public.transactions;  -- 0
RESET ROLE;
```

Le lint `rls_enabled_no_policy` et `public_bucket_allows_listing` doivent avoir
disparu de `get_advisors(type: security)`.
