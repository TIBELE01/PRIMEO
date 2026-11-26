# Audit de sécurité — écosystème Primeo (26 novembre 2026)

Périmètre : API (`api.primeo.ci`), application web (`app.primeo.ci`), admin (`admin.primeo.ci`),
vitrine (`primeo.ci`), site légal (`legal.primeo.ci`), base Supabase.
Méthode : revue du code, tests dynamiques non destructifs en production (Playwright, requêtes API
avec les comptes client, pros et admin), analyse Firecrawl, analyseur de sécurité Supabase.

## 1. Failles détectées et corrigées

| # | Plateforme | Gravité | Description | Correction |
|---|---|---|---|---|
| 1 | Base Supabase | **Critique** | Tables `payout_accounts` (coordonnées de versement des pros), `withdrawal_requests` et `property_events` exposées sans RLS à l'API REST publique de Supabase | Migration `20261126200000_rls_missing_tables` : RLS activé (accès réservé au backend). Vérifié par l'analyseur Supabase : 0 table sans RLS |
| 2 | API | **Élevée** | `trust proxy = 1` : derrière Cloudflare + répartiteur Render, l'API identifiait chaque visiteur par l'IP interne du répartiteur (10.x). Le rate limiting (connexion : 5 essais / 15 min) était partagé entre tous les utilisateurs (blocage collectif possible) et les journaux de sécurité enregistraient une fausse IP | `TRUST_PROXY=3` sur Render. Vérifié : `/api/admin/client-ip` renvoie l'IP publique réelle ; non falsifiable par un faux `X-Forwarded-For` |
| 3 | Vitrine | **Élevée** | XSS stockée : contenus du CMS (accueil, FAQ du centre d'aide, À propos) et commentaires du blog insérés via `innerHTML` sans échappement. Démontré en remplaçant les réponses de l'API par une charge `<img onerror>` : code exécuté sur 3 pages | Filtre central dans `main.js` (chargé en premier sur toutes les pages) : balises actives, attributs `on*`, URL `javascript:` retirés de tout HTML injecté. Re-test : 0 exécution sur les 24 pages |
| 4 | Vitrine | **Moyenne** | Fichiers internes téléchargeables : `package.json`, `build.js`, `scripts/` (dont le générateur du dossier partenariat), `node_modules/.package-lock.json`, `README.md`, `.deploy` | Le build publie un dossier `dist/` ne contenant que les fichiers publics ; règles Render renvoyant les anciens chemins vers la page 404. Vérifié : 9/9 chemins bloqués |
| 5 | Vitrine, site légal, application web | **Moyenne** | Aucun HSTS, aucune protection anti-clickjacking (écran de connexion de l'application intégrable dans un site tiers), pas de `Referrer-Policy` ni `Permissions-Policy` | En-têtes Render : HSTS 1 an, `X-Frame-Options: SAMEORIGIN`, CSP `frame-ancestors 'self'; base-uri 'self'; object-src 'none'`, `Referrer-Policy`, `Permissions-Policy` |
| 6 | Admin | **Moyenne** | Pas de HSTS ; en-tête `X-Powered-By: Next.js` révélant la technologie | `next.config.js` : HSTS, CSP `frame-ancestors 'none'; form-action 'self'`, `Permissions-Policy`, COOP, `poweredByHeader: false` |
| 7 | API | **Faible** | Changement de mot de passe depuis le profil : 8 caractères suffisaient (l'inscription exige majuscule + minuscule + chiffre) | Même règle appliquée. Vérifié en production (400 avec message explicite) |
| 8 | Base Supabase | **Faible** | Fonction `generate_referral_code` avec `search_path` modifiable | `search_path` figé à `public` |
| 9 | Vitrine, site légal | **Faible** | Cookie de consentement sans attribut `Secure` | Attribut `Secure` ajouté |
| 10 | Admin | **Élevée** | Aucun écran ne permettait à un administrateur d'activer la 2FA (ni dans l'admin, ni dans l'application) : les comptes admin restaient protégés par le seul mot de passe | Page Configuration → Sécurité du compte (QR code, clé manuelle, confirmation par code), appuyée sur les routes 2FA existantes de l'API |

## 2. Contrôles réussis (aucune faille)

- **Authentification** : jeton Supabase vérifié côté serveur à chaque requête (détecte les jetons révoqués), rôle du jeton recoupé avec la base (incohérence = 403 + alerte Sentry), comptes suspendus/bannis refusés, 2FA appliquée côté API (une session « mot de passe seul » est refusée si la 2FA est active). Jeton forgé → 401.
- **Autorisation** : 12 routes protégées sans jeton → 401 ; client et pro sur 6 routes admin → 403 ; client sur routes pro → 403 ; compte client sur la connexion admin → 403.
- **IDOR** : un client ne peut ni lire, ni annuler, ni consulter la facture, le statut de paiement ou la messagerie de la réservation d'un autre client (403) ; un pro ne peut pas modifier/supprimer l'annonce d'un autre pro ni ajouter un plat à son établissement (403) ; sous-ressources restaurant (créneaux, tables, plats, promotions) contrôlées par établissement.
- **Affectation de champs interdits** : `role`, `accountType`, `walletBalance`, `status`, `kycStatus`, `email` envoyés sur `PATCH /users/me` → ignorés.
- **Portefeuille** : solde non modifiable par le client ; retrait négatif → 400 ; retrait supérieur au solde → 422 ; aucune route de crédit côté client.
- **Paiements** : montants calculés exclusivement côté serveur (aucun montant accepté du client) ; clés Genius Pay uniquement côté serveur (absentes des bundles) ; idempotence sur la création de réservation (`Idempotency-Key`).
- **Webhooks** : Genius Pay (HMAC-SHA256 comparé en temps constant, fenêtre anti-rejeu ±5 min, idempotence) ; Brevo et OneSignal sans signature → 401 ; signature fausse → 401.
- **Validation** : Zod sur les routes ; données invalides → 400 (jamais 500) ; JSON malformé → 400 ; opérateurs NoSQL → 400 ; pollution de prototype → 400 ; corps de 12 Mo → 413 ; injections SQL bloquées en amont par le pare-feu applicatif de Render (Prisma paramètre de toute façon les requêtes).
- **Rate limiting** : connexion, inscription, OTP, 2FA, mot de passe oublié (5 / 15 min par IP, stockage Redis partagé) ; global 300 / min ; candidature spontanée limitée.
- **CORS** : liste fermée des domaines Primeo (aucun joker).
- **Secrets** : aucun secret dans le dépôt (seulement des valeurs d'exemple) ni dans les bundles de l'application et de l'admin ; aucune fuite dans les réponses d'erreur (pas de pile technique) ; documentation Swagger désactivée en production.
- **Application** : jetons stockés dans SecureStore sur mobile ; HTTPS partout (HTTP redirigé) ; liens profonds vers des écrans protégés sans session → retour à l'accueil public ; données affichées via des composants React/React Native (échappement automatique).
- **Admin** : pages protégées sans session → redirection vers `/login` (middleware serveur) ; jeton en cookie `Secure` + `SameSite=Strict` ; paramètre `redirect` non exploité (pas de redirection ouverte).
- **Site légal** : test XSS par empoisonnement de l'API : 0 exécution sur 28 pages.

## 3. Actions nécessitant votre intervention

| Priorité | Action | Où |
|---|---|---|
| **Élevée** | Activer la 2FA sur le compte super-admin `support.primeo@gmail.com` : la connexion admin fonctionne aujourd'hui avec le seul mot de passe (l'activation demande votre téléphone, je ne peux pas la faire à votre place) | Admin → Configuration → **Sécurité du compte** (page ajoutée) : scanner le QR code, saisir le code |
| Moyenne | Activer la protection contre les mots de passe divulgués (vérification HaveIBeenPwned) | Supabase → Authentication → Sign In / Providers → Password security |
| Moyenne | Restreindre la clé Geoapify (visible dans l'application web, c'est normal pour une clé navigateur) aux domaines `app.primeo.ci` et `primeo.ci` | Tableau de bord Geoapify → API key → Allowed origins |
| Faible | Configurer `ONESIGNAL_WEBHOOK_SECRET` si les webhooks OneSignal sont utilisés (sans lui, ils sont refusés par sécurité) | Render → service API → Environment |
| Faible | Si le mot de passe admin (`ADMIN_PASSWORD`) a été partagé hors de Render, le changer | Admin + Render |

## 4. Limites de l'audit

- Tests en production volontairement non destructifs : aucun paiement réel, aucune réservation ni annulation réelle ; l'exactitude des remboursements et des prélèvements d'abonnement a été vérifiée par lecture du code (logique déjà couverte par 996 tests backend), pas par transaction réelle.
- Le compte client de test existant (`tibeleyeo@gmail.com`) a été utilisé au lieu d'en créer un nouveau, pour ne pas ajouter de données factices en production.
- Stockage web : sur `app.primeo.ci`, les jetons de session sont en `localStorage` (fonctionnement standard d'une application web React Native) ; le risque reste théorique tant que le rendu échappe les données (vérifié).
