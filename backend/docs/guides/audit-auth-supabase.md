# Audit de la migration Supabase Auth — Rapport

Date : 2026-06-10 · Projet Supabase : `qaiplagtbnxvctvpofuh`

## 1. Verdict

La migration vers Supabase Auth est **complète côté code** et, après les
corrections de données appliquées pendant cet audit, **cohérente côté base**.
Deux actions manuelles restent nécessaires dans le dashboard Supabase avant de
déclarer le login Google opérationnel (voir §5).

## 2. Points conformes (vérifiés)

### Code backend — 100 % Supabase Auth
| Fonction | Implémentation | Fichier |
|---|---|---|
| Inscription client | `supabaseAdmin.auth.admin.createUser` + `signInWithPassword`, **sans OTP** | `auth.service.ts` |
| Inscription pro | OTP SMS (Redis, rate-limit 3/h) → création Supabase après vérification | `auth.service.ts` |
| Connexion | `supabaseAuth.auth.signInWithPassword` + contrôle statut/KYC en base | `auth.service.ts` |
| Rafraîchissement | `supabaseAuth.auth.refreshSession` (rotation gérée par Supabase) | `auth.service.ts` |
| Mot de passe oublié | `generateLink(type: 'recovery')` + envoi Brevo ; reset validé par le recovery token Supabase | `auth.service.ts` |
| Login Google | Validation de session Supabase + contrôle provider + réservé aux clients | `auth.service.ts` (`googleAuth`) |
| Connexion admin | `signInWithPassword` + vérification `app_metadata.role === 'admin'` + TOTP | `admin-auth.controller.ts` |
| Middleware JWT | `supabaseAdmin.auth.getUser(token)` (détecte les tokens révoqués) + **contrôle de cohérence rôle JWT ↔ base** (refus + log sécurité si divergence) | `jwt-auth.middleware.ts` |
| Rôles | `authorize(...roles)` sur le rôle issu de la base ; gate `requireKycApproved` branché sur bookings/availabilities/boosts/professional | `roles.middleware.ts`, `professional.middleware.ts` |
| Sync des rôles | `syncSupabaseRole()` aligne `app_metadata.role` après tout changement d'`accountType` | `role-sync.ts` |

### Résidus de l'ancien système — aucun
- Aucune occurrence de `bcrypt`, `jsonwebtoken`, `jwt.sign`, `JWT_SECRET`,
  `password_hash` dans `backend/src`.
- `schema.prisma` : aucune colonne `passwordHash` / `resetToken` / secret 2FA
  (le secret TOTP vit chiffré dans `user_metadata` Supabase).
- Base de production : aucune colonne mot de passe/token dans `public.users`
  (vérifié via information_schema).
- Seul résidu : variables `JWT_SECRET`/`JWT_REFRESH_SECRET`/`BCRYPT_SALT` dans
  le fichier **local non versionné** `backend/.env` — inoffensives (plus lues
  par `env.config.ts`), à supprimer à l'occasion. Les templates versionnés
  (`.env.example`, `.env.production`, `.env.staging`, `.env.test`) sont propres.

### Base de données (vérifié via MCP)
- `public.users.id` = UUID `auth.users.id` pour **13/13** utilisateurs.
- `app_metadata.role` = `users.accountType` pour **13/13** (0 incohérence).
- RLS activé sur les **80** tables, 36 politiques restrictives ; les clés
  `anon`/`authenticated` ne peuvent pas lire les tables métier — seul le
  backend (service_role) y accède. Les avis « RLS enabled no policy » restants
  sont des INFO attendues (choix documenté : accès backend uniquement).
- Logs auth Supabase : connexions réelles réussies (password + refresh +
  logout) les 9–10 juin — le flux fonctionne en production.

## 3. Anomalies détectées et corrigées pendant l'audit

1. **5 comptes seed orphelins** (`usr_client_001/002`, `usr_pro_001/002/003`)
   présents dans `public.users` avec des IDs non-UUID et **absents de
   `auth.users`** → impossibles à connecter, alors qu'ils possèdent 45
   propriétés du catalogue démo. Correction (transaction atomique via MCP) :
   - création des identités Supabase Auth (email confirmé, mot de passe
     aléatoire non divulgué — récupérable via « mot de passe oublié »,
     `app_metadata.role` aligné) ;
   - ré-attribution des nouveaux UUIDs dans les 11 colonnes référentes
     (properties, bookings, messages, notifications, subscriptions,
     professional_profiles, transactions, reviews, community_*) ;
   - suppression des anciennes lignes. Résultat : 0 orphelin, 0 propriété
     orpheline.
2. **Profil professionnel manquant** pour un compte pro
   (`professional_hebergement` du 03/06) : le middleware le traitait comme
   « pending » (sûr) mais il était invisible dans la file KYC admin → profil
   `pending` créé.
3. **Fonction `rls_auto_enable()` (SECURITY DEFINER) exécutable par `anon` et
   `authenticated`** via `/rest/v1/rpc` (avis sécurité Supabase) → `REVOKE
   EXECUTE` appliqué (migration `revoke_rls_auto_enable_from_clients`).
4. **Client Prisma local obsolète** (échec de compilation des tests sur
   `phone: null`) → `prisma generate` relancé ; aucun changement de code.

## 4. Tests exécutés

- Suite backend (Jest) : suites auth + middleware + smoke — toutes vertes
  (validation des flux register/login/OTP/TOTP/refresh avec Supabase mocké).
- Validation au niveau données (MCP, production) : intégrité auth ↔ public,
  cohérence des rôles, statuts KYC, logs de connexion réels.
- **Tests E2E HTTP impossibles depuis cet environnement** (réseau sortant vers
  Supabase bloqué : « Host not in allowlist »). Un script prêt à l'emploi a été
  ajouté : `backend/scripts/validate-auth.mjs` — il déroule inscription client
  (sans OTP), connexion, acceptation du JWT par le middleware, cloisonnement
  des rôles (client → admin/pro = 403), refresh, inscription pro (OTP
  déclenché), forgot-password et rejet de JWT invalide, puis supprime les
  comptes de test. À lancer depuis un poste avec accès réseau :
  ```bash
  API_URL=https://primeo-api.onrender.com \
  SUPABASE_URL=https://qaiplagtbnxvctvpofuh.supabase.co \
  SUPABASE_SERVICE_ROLE_KEY=*** \
  node backend/scripts/validate-auth.mjs
  ```

## 5. Actions manuelles restantes (dashboard Supabase)

1. **Activer le provider Google** : Authentication → Providers → Google
   (Client ID + Secret OAuth). Les logs montrent des tentatives récentes
   rejetées avec `Unsupported provider: provider is not enabled`. Ajouter
   aussi les URLs de redirection (schéma mobile + domaine web) dans
   Authentication → URL Configuration.
2. **Activer la protection contre les mots de passe compromis**
   (HaveIBeenPwned) : Authentication → Policies — avis sécurité Supabase.
3. *(Optionnel)* Restreindre la politique SELECT « Lecture publique
   property-media » du bucket `property-media` : elle autorise le **listage**
   complet du bucket ; les URLs publiques fonctionnent sans cette politique.
   À ne retirer qu'après vérification que ni le mobile ni la vitrine ne
   listent le bucket côté client.

## 6. Comptes seed migrés — mode d'accès

Les 5 comptes démo ont désormais une identité Supabase avec mot de passe
aléatoire inconnu. Pour s'y connecter : « Mot de passe oublié » avec l'email
du compte (hotel.savane@, immo.abidjan@, resto.cocody@, ama.konan@,
koffi.assi@gmail.com), ou réinitialisation directe par l'admin via
`supabaseAdmin.auth.admin.updateUserById`.
