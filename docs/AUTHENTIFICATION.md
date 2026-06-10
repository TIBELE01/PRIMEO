# Authentification Primeo — Architecture Supabase Auth Exclusive (juin 2026)

> Document de référence : architecture d'authentification après migration complète
> vers Supabase Auth. Plus aucun mécanisme legacy (JWT maison, bcrypt local,
> tokens de réinitialisation en base, TOTP stocké en Prisma, table refresh_tokens).

---

## 1. Architecture finale

### 1.1 Vue d'ensemble

| Couche | Implémentation | Supabase Auth ? |
|---|---|---|
| **Backend** (`backend/src/modules/auth`) | Express + Supabase Auth exclusivement | ✅ Sessions, JWT, passwords, password reset, TOTP metadata |
| **Mobile** (`mobile/src/screens/auth`, `src/store/authStore.ts`) | Appels REST backend, tokens en SecureStore | ✅ JWT Supabase |
| **Admin** (`admin/src/app/(auth)`) | Login via `/admin/auth/login`, token en cookie | ✅ JWT Supabase |

### 1.2 Principes clés

- **Aucun mot de passe stocké localement** : Supabase Auth est la seule source
  de vérité pour les credentials.
- **Aucun JWT maison** : `JWT_SECRET`, `JWT_REFRESH_SECRET`, `BCRYPT_SALT`
  supprimés de l'environnement. Les JWT sont émis et vérifiés par Supabase.
- **Rôles via `app_metadata.role`** : le middleware lit le rôle directement
  depuis le JWT Supabase (`supabaseAdmin.auth.getUser(token)`).
- **TOTP stocké dans `user_metadata` Supabase** : `twoFactorEnabled` et
  `twoFactorSecret` sont dans `user_metadata` du user Supabase, plus dans Prisma.
- **Réinitialisation de mot de passe** : Supabase `admin.generateLink({ type: 'recovery' })`
  génère un lien sécurisé envoyé via Brevo. Le mobile parse le `access_token`
  du deep link `primeo://reset-password#access_token=xxx&type=recovery`.

---

## 2. Flux par type de compte

### 2.1 Clients

| Action | Flux |
|---|---|
| **Inscription email** | Formulaire → `POST /auth/register` → compte créé + session immédiate (sans OTP) |
| **Inscription Google** | OAuth Supabase → deep link `primeo://auth-callback` → `POST /auth/google` |
| **Connexion email** | `POST /auth/login` → `signInWithPassword` → tokens |
| **Connexion Google** | OAuth Supabase → `POST /auth/google` |
| **Mot de passe oublié** | `POST /auth/forgot-password` → `generateLink` → email Brevo |
| **Réinitialisation** | Deep link `primeo://reset-password#access_token=xxx` → `POST /auth/reset-password` avec `recoveryToken` |
| **2FA (TOTP)** | Setup: `user_metadata.twoFactorSecret` ; vérification: `POST /auth/verify-totp` |

### 2.2 Professionnels

| Action | Flux |
|---|---|
| **Inscription** | Formulaire → `POST /auth/register` → SMS OTP via Orange → `POST /auth/verify-phone` → compte créé |
| **Connexion** | `POST /auth/login` → `signInWithPassword` → tokens (+ TOTP si activé) |
| **KYC** | Documents soumis → admin approuve/rejette → statut `verificationStatus` mis à jour |

### 2.3 Admins

| Action | Flux |
|---|---|
| **Connexion** | `POST /admin/auth/login` → `signInWithPassword` Supabase → token cookie |
| **2FA** | Identique au flux utilisateur (TOTP via `user_metadata` Supabase) |

---

## 3. Schéma Prisma

Les champs suivants ont été supprimés de la table `users` :

| Champ supprimé | Raison |
|---|---|
| `passwordHash` | Supabase Auth gère les mots de passe |
| `resetToken` / `resetTokenExpiresAt` | Remplacé par Supabase `generateLink` |
| `otpCode` / `otpExpiresAt` | L'OTP était déjà stocké dans Redis |
| `twoFactorEnabled` / `twoFactorSecret` | Migré dans `user_metadata` Supabase |

La table `refresh_tokens` a été supprimée : Supabase gère les refresh tokens nativement.

---

## 4. Variables d'environnement

### 4.1 Variables supprimées

```
JWT_SECRET, JWT_REFRESH_SECRET, JWT_EXPIRE, JWT_REFRESH_EXPIRE, BCRYPT_SALT
```

### 4.2 Variables actives requises

```
SUPABASE_URL=https://qaiplagtbnxvctvpofuh.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

---

## 5. Configuration Supabase requise

### 5.1 Google OAuth

Dans le dashboard Supabase → Authentication → Providers → Google :
- Activer Google Provider
- Ajouter `Client ID` et `Client Secret` Google
- Redirect URLs autorisées :
  - `primeo://auth-callback` (mobile natif)
  - `https://primeo-mobile-web-xt9o.onrender.com` (web)

### 5.2 Email templates

Les emails de réinitialisation de mot de passe sont envoyés via Brevo (pas les templates Supabase par défaut). Le lien généré par `generateLink` est inséré dans le template Brevo.

### 5.3 URL de redirection pour reset password

Dans Supabase → Authentication → URL Configuration :
- Site URL : `https://primeo-mobile-web-xt9o.onrender.com`
- Redirect URLs : ajouter `primeo://reset-password`

---

## 6. Deep links mobiles

| Deep link | Action |
|---|---|
| `primeo://auth-callback#access_token=...&refresh_token=...` | Callback Google OAuth → écran principal |
| `primeo://reset-password#access_token=...&type=recovery` | Réinitialisation mot de passe → `ResetPasswordScreen` |

Le parsing du fragment est géré dans `App.tsx` via `getStateFromPath`.

---

## 7. Scénarios de test

| # | Scénario | Résultat attendu |
|---|---|---|
| 1 | Inscription client email/mdp | Compte créé, session ouverte immédiatement (sans OTP) |
| 2 | Inscription pro → SMS OTP | Code reçu, vérification, compte `status: pending` |
| 3 | Inscription Google (client) | OAuth Supabase, compte créé, session ouverte |
| 4 | Inscription Google (pro) | Refus 403 côté backend |
| 5 | Connexion email/mdp | Tokens retournés |
| 6 | Mot de passe oublié | Email Brevo reçu avec lien Supabase |
| 7 | Réinitialisation (lien email) | Deep link ouvre ResetPasswordScreen, nouveau mdp accepté |
| 8 | 2FA setup + vérification | Secret en `user_metadata` Supabase, code TOTP vérifié |
| 9 | Admin login | Supabase sign-in, role=admin vérifié, token cookie |
| 10 | Token refresh | `refreshSession` Supabase, nouveau accessToken |
