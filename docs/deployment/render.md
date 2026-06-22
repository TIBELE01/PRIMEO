# Déploiement sur Render (Blueprint)

Tout le déploiement est décrit dans **`render.yaml`** à la racine du dépôt
([Render Blueprint](https://render.com/docs/blueprint-spec)). Un seul fichier
versionné décrit les 4 services ; Render les crée et les maintient à jour.

## Architecture déployée

| Service | Type Render | Dossier (`rootDir`) | Rôle |
|---|---|---|---|
| **primeo-api** | Web (Node) | `backend/` | API REST + Socket.io (Express + Prisma) |
| **primeo-vitrine** | Static | `Primeo/` | Site vitrine (HTML/CSS/JS) |
| **primeo-legal** | Static | `legal-site/` | Site légal (HTML/CSS/JS) |
| **primeo-admin** | Web (Node) | `admin/` | Dashboard Next.js (sortie `standalone`) |

> **L'application mobile (Expo / React Native) n'est PAS déployée sur Render.**
> Elle est testée via Expo Go puis publiée sur Google Play / App Store ultérieurement.
> Aucun service `primeo-mobile-web` ne figure dans `render.yaml`.

La base de données **PostgreSQL est hébergée sur Supabase** (pas sur Render).

---

## Prérequis

- Compte [Render](https://render.com) + dépôt GitHub connecté.
- Projet [Supabase](https://supabase.com) créé (PostgreSQL + Auth).
- Les clés des intégrations tierces disponibles (Genius Pay, Brevo, OneSignal,
  Orange SMS, Cloudinary, Geoapify, Upstash…). Toutes les intégrations tierces
  sont **optionnelles** : leur absence ne bloque pas le démarrage (la
  fonctionnalité concernée se dégrade proprement, cf. `reportEnvReadiness`).

**Variables réellement obligatoires** au démarrage du backend :
`DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
`DIRECT_URL` est en plus **requise pour les migrations** (`prisma migrate deploy`).

---

## 1. Première mise en place (Blueprint)

1. Sur Render : **New → Blueprint**.
2. Sélectionner le dépôt et la branche **`main`**. Render détecte `render.yaml`
   et liste les 4 services.
3. Render demande la valeur de chaque variable marquée `sync: false`
   (voir §3). Les renseigner, puis **Apply**.
4. Render crée et déploie les 4 services. Le backend exécute, dans l'ordre :
   `buildCommand` → `preDeployCommand` (migrations) → `startCommand`.

> Les services web (`primeo-api`, `primeo-admin`) sont en plan **`starter`** :
> le `preDeployCommand` (migrations Prisma) nécessite un plan **payant**
> (indisponible sur l'offre gratuite). Les deux sites statiques sont gratuits.

---

## 2. Connexion Supabase — pooled vs direct

Dans Supabase : *Project Settings → Database → Connection string*.

| Variable | Mode | Port | Usage |
|---|---|---|---|
| `DATABASE_URL` | **Transaction pooler** (PgBouncer) | `6543` | Runtime de l'API. Ajouter `?pgbouncer=true`. |
| `DIRECT_URL` | **Direct connection** | `5432` | Utilisée par `prisma migrate deploy`. |

Exemples :

```
DATABASE_URL=postgresql://postgres.<REF>:<PASSWORD>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.<REF>:<PASSWORD>@aws-0-<region>.pooler.supabase.com:5432/postgres
```

Le `datasource db` de `backend/prisma/schema.prisma` référence les deux :
`url = env("DATABASE_URL")` et `directUrl = env("DIRECT_URL")`.

---

## 3. Variables d'environnement

> ⚠️ **Aucun secret n'est stocké dans `render.yaml`.** Les variables `sync: false`
> doivent être saisies dans le dashboard Render (Service → Environment), ou au
> moment du **Apply** du Blueprint.

### `primeo-api` (backend)

Valeurs **non secrètes déjà fixées** dans `render.yaml` :
`NODE_ENV=production`, `ALLOW_DEV_ADMIN_SEED=false`, `COOKIE_SECURE=true`,
`COOKIE_SAMESITE=none`, `SKIP_OTP_VERIFICATION=false`, `MAINTENANCE_MODE=false`,
`SOCKET_IO_REDIS_ENABLED=false`, `EXCHANGERATE_BASE_CURRENCY=XOF`, `CORS_ORIGINS=…`.

> `PORT` est **injecté automatiquement par Render** — ne pas le définir.
> Le backend écoute sur `process.env.PORT` (cf. `server.listen(env.PORT)`).

À renseigner dans le dashboard (`sync: false`) :

| Groupe | Variables | Obligatoire |
|---|---|---|
| Base de données | `DATABASE_URL`, `DIRECT_URL` | ✅ (DIRECT_URL pour migrations) |
| URLs | `PUBLIC_URL`, `BACKEND_URL`, `FRONTEND_URL` | recommandé |
| Supabase Auth | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | ✅ |
| Admin seed | `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_EMAILS` | recommandé |
| Cookies | `COOKIE_DOMAIN` (ex: `.primeo.ci`) | optionnel |
| Genius Pay | `GENIUS_PAY_API_KEY`, `GENIUS_PAY_SECRET_API_KEY`, `GENIUS_PAY_WEBHOOK_SECRET`, `GENIUS_PAY_API_URL` | optionnel |
| Brevo (email) | `BREVO_API_KEY`, `BREVO_SMTP_HOST`, `BREVO_SMTP_PORT`, `BREVO_SMTP_USER`, `BREVO_SMTP_PASS`, `BREVO_WEBHOOK_SECRET` | optionnel |
| OneSignal (push) | `ONESIGNAL_APP_ID`, `ONESIGNAL_REST_API_KEY`, `ONESIGNAL_WEBHOOK_SECRET` | optionnel |
| Orange SMS (OTP) | `ORANGE_CLIENT_ID`, `ORANGE_CLIENT_SECRET`, `ORANGE_SENDER`, `ORANGE_WEBHOOK_SECRET` | optionnel |
| Cloudinary | `CLOUDINARY_URL` (`cloudinary://key:secret@cloud`) | optionnel |
| Geoapify | `GEOAPIFY_API_KEY`, `GEOAPIFY_URL` | optionnel |
| Upstash Redis | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `REDIS_URL` | optionnel |
| Taux de change | `EXCHANGERATE_API_KEY` | optionnel |
| Observabilité | `SENTRY_DSN`, `LOGTAIL_SOURCE_TOKEN`, `SLACK_WEBHOOK_URL` | optionnel |

> La liste de référence (avec valeurs par défaut et validation) est
> `backend/src/config/env.config.ts`.

### `primeo-admin` (dashboard)

Fixées dans `render.yaml` : `NODE_ENV=production`, `HOSTNAME=0.0.0.0`.

À renseigner (`sync: false`) :

| Variable | Exemple | Note |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `https://api.primeo.ci` | **Injectée au build** (préfixe `NEXT_PUBLIC_`). |

### `primeo-vitrine` / `primeo-legal`

Sites statiques — **aucune variable d'environnement** requise.

---

## 4. Détails de build par service

### Backend (`primeo-api`)
- **Build** : `npm install --include=dev && npx prisma generate && npm run build`
  - `--include=dev` force l'installation des devDependencies (`prisma`,
    `typescript`) même quand Render fixe `NODE_ENV=production` au build.
  - `npm run build` = `tsc -p tsconfig.build.json` → sortie dans `dist/`.
- **Pre-deploy** : `npx prisma migrate deploy` (applique les migrations *après*
  le build, *avant* la bascule du trafic).
- **Start** : `npm start` = `node dist/main.js`.
- **Health check** : `/api/health`.

### Dashboard admin (`primeo-admin`)
- **Build** :
  `npm install --include=dev && npm run build && cp -r .next/static .next/standalone/.next/ && cp -r public .next/standalone/public`
  - `next.config.js` utilise `output: 'standalone'`. Next **ne copie pas**
    automatiquement `.next/static` ni `public/` dans le dossier `standalone` :
    les deux `cp` corrigent cela, sans quoi les assets et `/public` renvoient 404.
- **Start** : `npm start` = `node .next/standalone/server.js`
  (écoute `PORT` + `HOSTNAME` injectés par Render).

### Sites statiques (`primeo-vitrine`, `primeo-legal`)
- **Build** : aucun (commande no-op). Le contenu est servi tel quel.
- **Publish path** : `./Primeo` et `./legal-site`. Render sert
  automatiquement `index.html` pour les chemins répertoire (`/produits/` →
  `/produits/index.html`).

---

## 5. Déploiement continu

`autoDeploy: true` sur chaque service : **tout `git push` sur `main`** déclenche
le rebuild + redéploiement du/des service(s) concerné(s). Aucune action manuelle.

Pour ne déclencher manuellement qu'un service : *Service → Manual Deploy*, ou un
**Deploy Hook** (*Settings → Deploy Hook*) appelé par un pipeline externe.

Toute modification de `render.yaml` poussée sur `main` est appliquée par Render
(création/mise à jour des services) au prochain *Sync* du Blueprint.

---

## 6. Test local avant déploiement

Reproduire les commandes Render localement (depuis la racine du dépôt) :

```bash
# Backend — build + migrations + démarrage
cd backend
npm install --include=dev
npx prisma generate
npm run build                 # = tsc -p tsconfig.build.json → dist/
DIRECT_URL=... npx prisma migrate deploy
PORT=4000 npm start           # node dist/main.js → http://localhost:4000
curl http://localhost:4000/api/health

# Dashboard admin — build standalone + assets
cd ../admin
npm install --include=dev
npm run build
cp -r .next/static .next/standalone/.next/
cp -r public .next/standalone/public
PORT=3001 HOSTNAME=0.0.0.0 node .next/standalone/server.js

# Sites statiques — simple serveur HTTP
npx serve Primeo
npx serve legal-site
```

Validation du Blueprint sans déployer (CLI Render) :

```bash
# https://render.com/docs/cli
render blueprint launch        # crée/synchronise depuis render.yaml
render services                # liste les services
render logs -r <service-id>    # logs en direct
```

---

## 7. Domaines personnalisés (optionnel)

*Service → Settings → Custom Domains*, puis CNAME chez le registrar :

| Service | Domaine suggéré | CNAME → |
|---|---|---|
| primeo-api | `api.primeo.ci` | `primeo-api.onrender.com` |
| primeo-vitrine | `primeo.ci` / `www.primeo.ci` | `primeo-vitrine.onrender.com` |
| primeo-legal | `legal.primeo.ci` | `primeo-legal.onrender.com` |
| primeo-admin | `admin.primeo.ci` | `primeo-admin.onrender.com` |

Après ajout des domaines, vérifier que `CORS_ORIGINS` (backend) et
`NEXT_PUBLIC_API_URL` (admin) pointent bien vers les domaines finaux.
SSL Let's Encrypt est activé automatiquement par Render.

---

## 8. Rollback

- **Code / service** : *Render → Service → Deploys →* choisir un déploiement
  antérieur → **Rollback** (redéploie l'image précédente, sans rebuild).
- **Base de données** : un rollback applicatif **n'annule pas** une migration
  déjà appliquée. Pour revenir sur un changement de schéma, restaurer un backup
  Supabase (*Database → Backups*) ou appliquer une migration corrective
  (`prisma migrate`). Voir `docs/deployment/backup-restore.md`.
- **Bonne pratique** : pour une migration risquée, déployer d'abord la migration
  rétrocompatible, valider, puis nettoyer dans un déploiement ultérieur.

---

## 9. Dépannage

| Symptôme | Cause probable | Correctif |
|---|---|---|
| Build backend : `tsc: not found` / `prisma: not found` | devDependencies non installées | garder `npm install --include=dev` |
| `prisma migrate deploy` échoue (P1001) | `DIRECT_URL` absente ou pooler au lieu du direct (5432) | définir `DIRECT_URL` (connexion directe) |
| Admin : 404 sur les assets `/_next/static` ou `/public` | assets non copiés dans `standalone` | conserver les `cp` du buildCommand |
| Admin inaccessible (timeout) | serveur lié à `localhost` | `HOSTNAME=0.0.0.0` (déjà dans render.yaml) |
| CORS bloqué côté admin/vitrine | origine absente de `CORS_ORIGINS` | ajouter le domaine à `CORS_ORIGINS` |
| `preDeployCommand` ignoré | service en plan gratuit | passer le service en plan payant (`starter`) |
| Démarrage backend stoppé (exit 1) | variable requise manquante | renseigner `DATABASE_URL` + clés Supabase |

Vérifications post-déploiement :

```bash
curl https://api.primeo.ci/api/health      # backend
curl -I https://primeo.ci                   # vitrine
curl -I https://legal.primeo.ci             # légal
curl -I https://admin.primeo.ci             # admin
```
