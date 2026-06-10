# Authentification Primeo — Audit & Refonte (juin 2026)

> Document de référence : audit complet du système d'authentification
> (Supabase Auth) et description des modifications apportées au flux **clients**
> (suppression de l'OTP + connexion Google).

---

## 1. Rapport d'audit initial

### 1.1 Architecture réelle constatée

| Couche | Implémentation | Supabase ? |
|---|---|---|
| **Backend** (`backend/src/modules/auth`) | Express + Supabase Auth (création/connexion/refresh des sessions) + OTP SMS Orange + TOTP | ✅ Oui (sessions, mots de passe, JWT) |
| **Mobile** (`mobile/src/screens/auth`, `src/store/authStore.ts`) | Appels REST vers le backend, tokens en SecureStore | Indirect (les tokens reçus sont des JWT Supabase) |
| **Admin** (`admin/src/app/(auth)`) | Login email/mdp + TOTP via `/admin/auth/login`, token en cookie `SameSite=Strict` | Indirect |

La migration Supabase est **effective côté backend** : `signInWithPassword`,
`refreshSession`, `admin.createUser`, vérification des JWT via
`supabaseAdmin.auth.getUser(token)` (middleware `jwt-auth.middleware.ts`).
Le rôle est porté par `app_metadata.role` du JWT Supabase.

### 1.2 Points fonctionnels corrects

- **Inscription** : validation Zod stricte (email, téléphone ivoirien
  `+2250XXXXXXXXX`, mot de passe 8+ caractères avec majuscule/minuscule/chiffre),
  unicité email + téléphone vérifiée en base avant tout envoi de SMS.
- **OTP** : code 6 chiffres généré par `crypto.randomInt`, TTL 5 min, stocké
  dans Upstash Redis avec repli mémoire ; envoi via Orange SMS (OAuth2) ;
  le bypass `SKIP_OTP_VERIFICATION` est doublement neutralisé en production.
- **Connexion** : identifiants validés par Supabase ; contrôles applicatifs
  (statut `suspended`/`banned`) après l'authentification, avec révocation
  immédiate de la session Supabase en cas de refus.
- **TOTP (2FA)** : RFC 6238 (OTPAuth), fenêtre de 5 min pour saisir le code,
  refresh token mis en attente dans Redis pendant la vérification.
- **Rotation de tokens** : `POST /auth/refresh` via `refreshSession` Supabase ;
  le mobile gère le refresh silencieux au démarrage et la file d'attente des 401.
- **Rate limiting** : 5 tentatives échouées / 15 min / IP sur tous les
  endpoints sensibles (`authRateLimit`).
- **Réinitialisation de mot de passe** : token 256 bits, TTL 30 min, réponse
  générique (pas de divulgation d'existence d'email), mise à jour via
  `admin.updateUserById`.
- **Mobile** : tokens dans SecureStore (chiffré), profil dans AsyncStorage,
  hydratation silencieuse au démarrage, déconnexion non bloquante.
- **Admin** : token en cookie `SameSite=Strict` + `Secure`, expiration de
  session 8 h avec suivi d'activité, TOTP, en-têtes de sécurité Next.js.
- **KYC professionnels** : profil `ProfessionalProfile` créé dès l'inscription
  (`verificationStatus: pending`), endpoints admin d'approbation/rejet avec
  motif, écran mobile `PendingValidationScreen` qui reflète le statut.

### 1.3 Anomalies détectées

1. **Secrets de production exposés dans le dépôt** (`backend/.env`,
   `render.yaml`) : clé service_role Supabase, URL base de données avec mot de
   passe, identifiants Orange SMS, Brevo, Genius Pay, et identifiants admin.
   → **À faire impérativement : faire tourner (rotate) toutes ces clés.**
2. **Incohérence rôle/middleware** : si `app_metadata.role` est absent, le
   middleware JWT retombe sur `client` au lieu de refuser ; le rôle Prisma
   (`accountType`) n'est jamais recoupé avec le rôle Supabase.
3. **KYC non bloquant** : un professionnel `pending`/`rejected` peut appeler
   les routes pro — le statut est purement informatif, aucune vérification
   dans les middlewares d'autorisation.
4. **Table `RefreshToken` morte** : définie dans Prisma mais jamais alimentée ;
   aucune liste de révocation applicative (la révocation repose sur Supabase).
5. **Secrets JWT inutilisés** : `JWT_SECRET`/`JWT_REFRESH_SECRET` sont validés
   dans `env.config` mais ne servent plus à rien (tout est délégué à Supabase).
6. **OTP dans les logs** : le contenu du SMS (donc le code) est enregistré dans
   `sms_logs` ; pas de hachage du code stocké dans Redis.
7. **Pas de backoff sur la vérification OTP/TOTP** : seule la limite IP
   s'applique ; pas de compteur d'échecs par téléphone/utilisateur.
8. **Token de réinitialisation stocké en clair** dans Prisma (non haché).
9. **Refresh token en clair dans Redis** pendant la fenêtre TOTP (5 min).
10. **Repli OTP en mémoire par processus** : état perdu au redéploiement,
    incompatible multi-instances.
11. **Admin** : protection des routes uniquement côté client (pas de
    `middleware.ts` Next), fallback de rôle laxiste dans la Sidebar
    (`super_admin` par défaut), pas de token CSRF explicite.
12. **Auto-provisioning admin hérité** : un admin Prisma sans compte Supabase
    est migré automatiquement à la première connexion — chemin de connexion
    alternatif à surveiller.

### 1.4 Risques (par criticité)

| Criticité | Risque |
|---|---|
| **Critique** | Secrets exposés dans le dépôt → compromission totale (DB, Supabase service_role = contrôle des comptes, rôle admin modifiable). |
| **Élevé** | KYC non appliqué → un pro rejeté peut continuer à opérer. |
| **Élevé** | Pas de recoupement rôle Supabase ↔ Prisma → une corruption de `app_metadata` change les droits effectifs. |
| **Moyen** | Brute-force OTP/TOTP partiellement couvert (uniquement par IP). |
| **Moyen** | Tokens de reset / refresh stockés en clair (DB / Redis). |
| **Faible** | Code mort (RefreshToken, secrets JWT) → confusion et fausse impression de sécurité. |

---

## 2. Modifications implémentées (clients uniquement)

### 2.1 Inscription client sans OTP

- `backend/src/modules/auth/auth.service.ts` — `register()` : si
  `accountType === 'client'`, le compte Supabase + la ligne `users` sont créés
  **immédiatement** et une session est ouverte (`signInWithPassword`). La
  réponse contient `accessToken`, `refreshToken` et `user` → l'app mobile
  authentifie directement (ce chemin de réponse était déjà géré par
  `Step5Validation.tsx`, aucun écran OTP n'est affiché).
- **Professionnels inchangés** : `pending user` en Redis → SMS OTP →
  `POST /auth/verify-phone` → création du compte (statut `pending`) →
  validation admin (KYC). Les endpoints `/auth/verify-phone` et
  `/auth/resend-otp` restent en place pour eux.

### 2.2 Connexion / inscription Google (Supabase OAuth 2.0)

**Nouveau endpoint** : `POST /api/auth/google` (`{ accessToken, refreshToken }`).

Flux complet :
1. L'app ouvre `https://<projet>.supabase.co/auth/v1/authorize?provider=google&redirect_to=<deep link>`
   (`mobile/src/services/googleAuth.ts`, via `expo-web-browser`).
2. Supabase exécute l'OAuth Google puis redirige vers
   `primeo://auth-callback` (natif) ou l'origine web, avec
   `#access_token=…&refresh_token=…` dans le fragment.
3. L'app appelle `POST /api/auth/google` ; le backend :
   - valide le token via `supabaseAdmin.auth.getUser()` et vérifie que la
     session provient bien du provider `google` ;
   - **compte existant (même UUID Supabase)** → connexion ; refus `403` si le
     compte est professionnel ou admin, contrôles `suspended`/`banned` ;
   - **premier login Google** → création de la ligne `users` avec
     `id = UUID Supabase`, `accountType: client`, `status: active`,
     `phone: null`, nom/prénom/avatar issus de `user_metadata` ;
   - fixe `app_metadata.role = 'client'` si absent.
4. L'app stocke les tokens (SecureStore) comme un login classique.

**Comptes Google = sans mot de passe** : `passwordHash = 'supabase_managed'`,
la session est entièrement gérée par Supabase. Un client existant
(email/mdp) qui se connecte avec Google sur **le même email vérifié** est
automatiquement lié par Supabase (même UUID) → ses données sont conservées.

**Migration DB** : `users.phone` devient **nullable**
(`prisma/migrations/20260610000000_phone_nullable_google_auth`) car les
comptes Google n'ont pas de numéro vérifié.

### 2.3 Frontend mobile

- `LoginScreen.tsx` : bouton **« Se connecter avec Google »** sous le
  formulaire (séparateur « ou »). L'écran de connexion est commun ; si un
  professionnel utilise le bouton, le backend répond
  `403 — La connexion Google est réservée aux comptes clients`.
- `RegisterScreen/Step2PersonalInfo.tsx` : bouton **« S'inscrire avec
  Google »** affiché **uniquement quand `accountType === 'client'`** — les
  étapes professionnelles et `ProRegisterScreen` n'affichent jamais l'option.
- Nouveau service `mobile/src/services/googleAuth.ts` (OAuth + stockage +
  mise à jour du store) ; `authApi.google()` ; dépendance `expo-web-browser`.
- Config : `EXPO_PUBLIC_SUPABASE_URL` ajouté à `.env`, `app.config.js`
  (`extra.supabaseUrl`), `eas.json` (3 profils) et `render.yaml`.

### 2.4 Ce qui ne change pas

- Connexion client email/mdp (avec TOTP si activé).
- Tout le flux professionnel : email + mdp + **OTP SMS** + **validation
  admin du KYC** ; pas de bouton Google sur leurs écrans d'inscription.
- Authentification admin (login + TOTP).
- Mot de passe oublié / réinitialisation.

---

## 3. Configuration Supabase requise (à faire dans le dashboard)

> Projet : `qaiplagtbnxvctvpofuh` — https://supabase.com/dashboard

### 3.1 Activer le provider Google

1. **Google Cloud Console** (https://console.cloud.google.com) :
   - Créer un projet « Primeo » → *APIs & Services → Credentials* →
     **Create OAuth client ID** (type *Web application*).
   - **Authorized redirect URI** (obligatoire, fournie par Supabase) :
     `https://qaiplagtbnxvctvpofuh.supabase.co/auth/v1/callback`
   - Configurer l'écran de consentement (nom « Primeo », logo, domaine
     `primeo.ci`), scopes `email`, `profile`, `openid`.
   - Récupérer **Client ID** et **Client Secret**.
2. **Supabase Dashboard** → *Authentication → Sign In / Providers → Google* :
   - **Enable Sign in with Google** : ON
   - **Client ID** / **Client Secret** : valeurs de l'étape 1.

### 3.2 URLs de redirection autorisées

*Authentication → URL Configuration → Redirect URLs* — ajouter :

```
primeo://auth-callback
https://primeo-mobile-web-xt9o.onrender.com/*
https://app.primeo.ci/*
http://localhost:8081/*          (dev Expo)
http://localhost:19006/*         (dev Expo web)
```

`Site URL` : `https://primeo-mobile-web-xt9o.onrender.com`

### 3.3 Liaison de comptes

*Authentication → Sign In / Providers* : laisser activée la liaison
automatique des identités sur email vérifié (comportement par défaut) — c'est
elle qui permet à un client existant email/mdp de « lier » son compte Google
sans perdre ses données (même UUID).

---

## 4. Scénarios de test

| # | Scénario | Résultat attendu |
|---|---|---|
| 1 | Inscription client email/mdp | `201` avec `accessToken`/`refreshToken`/`user` — **aucun SMS envoyé, aucun écran OTP**, session ouverte immédiatement, `status=active`. |
| 2 | Connexion client email/mdp | `200` avec tokens (ou `requiresTwoFactor` si TOTP activé). |
| 3 | Inscription via Google (nouveau compte) | Navigateur OAuth → retour app → `users` créé (`accountType=client`, `phone=null`) → session ouverte, `isNewUser=true`. |
| 4 | Connexion via Google (compte Google existant) | Session ouverte, `isNewUser=false`. |
| 5 | Connexion Google avec un compte **professionnel** | `403 — La connexion Google est réservée aux comptes clients`. Session Supabase révoquée. |
| 6 | Écrans pros (ProRegister, étapes pro de Register) | **Aucun bouton Google** affiché. |
| 7 | Inscription professionnelle | SMS OTP reçu → `verify-phone` → compte `pending` → visible dans l'admin (Modération/KYC) → approbation admin requise. |
| 8 | Client existant (email/mdp) se connecte avec Google (même email vérifié) | Supabase lie l'identité (même UUID) → connexion réussie, données conservées, mot de passe toujours valide. |

Vérifications effectuées dans cette session : compilation TypeScript backend
et mobile sans erreur ; le schéma Prisma migré (`phone` nullable) est couvert
par la migration SQL livrée (`prisma migrate deploy` l'applique au déploiement).
Les scénarios 1-8 nécessitent l'activation du provider Google dans le
dashboard Supabase (section 3) pour être joués en conditions réelles.

---

## 5. Recommandations restantes (issues de l'audit, non traitées ici)

1. **Rotation immédiate de tous les secrets** exposés dans le dépôt, puis
   passage aux variables d'environnement Render (valeurs `sync: false`).
2. Faire respecter le KYC dans les middlewares (bloquer les routes pro tant
   que `verificationStatus !== 'approved'`).
3. Recouper `app_metadata.role` avec `users.accountType` à chaque requête et
   refuser en cas d'incohérence (au lieu du fallback `client`).
4. Hacher les tokens de réinitialisation en base ; compteur d'échecs
   OTP/TOTP par cible avec backoff.
5. Supprimer le code mort (`RefreshToken`, `JWT_SECRET`/`JWT_REFRESH_SECRET`).
6. Admin : ajouter un `middleware.ts` Next pour la protection serveur des
   routes, et durcir le fallback de rôle de la Sidebar.
