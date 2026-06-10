# Déploiement sur Render

## Vue d'ensemble

Primeo utilise deux services Render :
- **`primeo-api`** : le backend Node.js + Express (API REST + Socket.io)
- **`primeo-admin`** : le dashboard Next.js (site statique ou SSR)

La base de données PostgreSQL est hébergée sur **Supabase** (non sur Render).

---

## Prérequis

- Compte [Render](https://render.com)
- Compte [Supabase](https://supabase.com) avec un projet créé
- Dépôt GitHub `tibele10/primeo` connecté à Render
- Toutes les clés API tierces disponibles (Genius Pay, Brevo, OneSignal, etc.)

---

## 1. Configuration de la base de données (Supabase)

1. Créer un projet sur [app.supabase.com](https://app.supabase.com)
2. Récupérer la **Connection string** (mode `Transaction pooler`) dans *Project Settings > Database*
3. Copier la `DATABASE_URL` au format : `postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres`

---

## 2. Déploiement du backend (primeo-api)

### Création du service sur Render

1. *New > Web Service*
2. Connecter le dépôt GitHub `tibele10/primeo`
3. Configurer :

| Champ | Valeur |
|---|---|
| **Name** | `primeo-api` |
| **Root Directory** | `backend` |
| **Environment** | `Node` |
| **Build Command** | `npm install && npx prisma generate && npx prisma migrate deploy && npm run build` |
| **Start Command** | `npm start` |
| **Instance Type** | Starter ($7/mois) — sans mise en veille |
| **Branch** | `main` |

### Variables d'environnement sur Render

Ajouter toutes les variables listées dans `.env.example` via l'interface Render (*Environment > Environment Variables*). Les variables obligatoires :

```
NODE_ENV=production
DATABASE_URL=...
GENIUS_PAY_API_KEY=...
GENIUS_PAY_SECRET_KEY=...
GENIUS_PAY_WEBHOOK_SECRET=...
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
BREVO_API_KEY=...
ONESIGNAL_APP_ID=...
ONESIGNAL_API_KEY=...
ORANGE_SMS_CLIENT_ID=...
ORANGE_SMS_CLIENT_SECRET=...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
GEOAPIFY_API_KEY=...
BACKEND_URL=https://api.primeo.ci
CORS_ORIGINS=https://admin.primeo.ci
```

### Domaine personnalisé

1. *Settings > Custom Domains > Add Custom Domain*
2. Saisir `api.primeo.ci`
3. Ajouter le CNAME chez votre registrar : `api.primeo.ci` → `primeo-api.onrender.com`
4. SSL Let's Encrypt activé automatiquement

---

## 3. Déploiement du dashboard admin (primeo-admin)

1. *New > Web Service*
2. Même dépôt, configurer :

| Champ | Valeur |
|---|---|
| **Name** | `primeo-admin` |
| **Root Directory** | `admin` |
| **Environment** | `Node` |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm start` |
| **Branch** | `main` |

3. Variables d'environnement :
```
NEXT_PUBLIC_API_URL=https://api.primeo.ci
NODE_ENV=production
```

4. Domaine personnalisé : `admin.primeo.ci`

---

## 4. Pipeline CI/CD (GitHub Actions → Render)

Le déploiement est automatisé via `.github/workflows/deploy-production.yml` :

```
push sur main
  └─▶ GitHub Actions
        ├─ pnpm install
        ├─ eslint + prettier
        ├─ jest (tests unitaires + intégration)
        └─ Render Deploy Hook (si tests OK)
              ├─▶ primeo-api : build + migrate + start
              └─▶ primeo-admin : build + start
```

Pour obtenir le **Deploy Hook** Render : *Service > Settings > Deploy Hook*.

---

## 5. Vérification post-déploiement

```bash
# Tester l'API
curl https://api.primeo.ci/api/health

# Tester le dashboard admin
curl -I https://admin.primeo.ci

# Healthcheck complet
bash scripts/healthcheck.sh https://api.primeo.ci
```

---

## 6. Rollback

En cas de problème, revenir à la version précédente depuis *Render > Service > Deploys > [commit précédent] > Rollback*.

Pour les migrations DB : restaurer le backup le plus récent (voir `scripts/backup-db.sh`).
