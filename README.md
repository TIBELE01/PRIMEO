# Primeo

Plateforme unifiée de réservation d'hébergements, de biens immobiliers et de tables de restaurant en Côte d'Ivoire. Mobile-first, paiement FCFA / mobile money, zéro commission pour les restaurants.

---

## Composants

| Workspace | Stack | URL |
|---|---|---|
| `backend` | Node.js · Express · TypeScript · Prisma | `api.primeo.ci` |
| `mobile` | React Native · Expo · TypeScript | iOS & Android |
| `admin` | Next.js · TypeScript | `admin.primeo.ci` |

Base de données : PostgreSQL hébergée sur **Supabase**.

---

## Prérequis

- **Node.js** >= 20.0.0
- **pnpm** >= 9.0.0 — `npm install -g pnpm`
- **Docker** et **Docker Compose** (pour la base de données locale)
- Comptes actifs : Supabase, Genius Pay, Brevo, OneSignal, Orange SMS, Cloudinary, Geoapify

---

## Démarrage rapide

```bash
# 1. Cloner le dépôt
git clone https://github.com/tibele10/primeo.git
cd primeo

# 2. Installer toutes les dépendances (tous les workspaces)
pnpm install

# 3. Copier et renseigner les variables d'environnement
cp .env.example backend/.env
# Éditer backend/.env avec vos vraies clés

# 4. Démarrer la base de données locale (Docker)
docker compose up -d

# 5. Générer le client Prisma + appliquer les migrations + seed
bash scripts/bootstrap.sh

# 6. Démarrer le backend en développement
pnpm dev:backend

# 7. (Autre terminal) Démarrer le dashboard admin
pnpm dev:admin
```

---

## Commandes utiles

```bash
# Tests backend
pnpm test:backend
pnpm test:backend:coverage

# Linting & formatage
pnpm lint
pnpm format

# Base de données
pnpm db:generate      # Régénère le client Prisma après modif du schéma
pnpm db:migrate       # Crée et applique une migration (dev)
pnpm db:migrate:prod  # Applique les migrations sans créer (production)
pnpm db:seed          # Peuple la base avec des données de test
pnpm db:studio        # Ouvre Prisma Studio (interface visuelle)

# Scripts d'administration
bash scripts/migrate-all.sh staging
bash scripts/create-admin.sh
bash scripts/backup-db.sh
bash scripts/healthcheck.sh
```

---

## Structure du monorepo

```
primeo/
├── backend/          # API REST Node.js + Express (Phase 2)
├── mobile/           # Application React Native + Expo (Phase 3)
├── admin/            # Dashboard Next.js (Phase 4)
├── docs/
│   ├── architecture/
│   ├── deployment/
│   └── guides/
├── scripts/
├── .env.example
├── docker-compose.yml
└── pnpm-workspace.yaml
```

---

## Environnements

| Environnement | Branche Git | Base de données |
|---|---|---|
| Développement local | `feature/*` | Docker PostgreSQL local |
| Staging | `develop` | Supabase staging |
| Production | `main` (tag) | Supabase production |

---

## Contribution

1. Créer une branche `feature/<nom>` depuis `develop`
2. Passer les tests : `pnpm test:backend`
3. Vérifier le linting : `pnpm lint`
4. Ouvrir une Pull Request vers `develop`
5. La PR est déployée automatiquement sur staging après merge
