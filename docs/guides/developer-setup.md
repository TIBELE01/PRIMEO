# Guide de démarrage local

Ce guide couvre l'installation complète de l'environnement de développement Primeo sur votre machine.

---

## Prérequis

| Outil | Version minimale | Installation |
|---|---|---|
| **Node.js** | 20.x LTS | [nodejs.org](https://nodejs.org) |
| **pnpm** | 9.x | `npm install -g pnpm` |
| **Docker Desktop** | Dernière version | [docker.com](https://docker.com) |
| **Git** | 2.x | [git-scm.com](https://git-scm.com) |

Vérifier les versions :
```bash
node -v       # v20.x.x
pnpm -v       # 9.x.x
docker -v     # Docker version 24.x.x
```

---

## 1. Cloner le dépôt

```bash
git clone https://github.com/tibele10/primeo.git
cd primeo
```

---

## 2. Installation automatique (recommandée)

```bash
bash scripts/bootstrap.sh
```

Ce script effectue automatiquement les étapes 3 à 7 ci-dessous.

---

## 3. Installation manuelle (étape par étape)

### 3.1 Installer les dépendances

```bash
pnpm install
```

### 3.2 Configurer les variables d'environnement

```bash
cp .env.example backend/.env
```

Éditer `backend/.env` et renseigner **au minimum** :
```
DATABASE_URL=postgresql://primeo:primeo_dev@localhost:5432/primeo_dev
SUPABASE_URL=<URL du projet Supabase>
SUPABASE_ANON_KEY=<clé anon Supabase>
SUPABASE_SERVICE_ROLE_KEY=<clé service role Supabase>
```

Les autres clés (Genius Pay, Brevo, OneSignal, etc.) peuvent être laissées avec des valeurs factices pour le développement local — les fonctionnalités correspondantes seront désactivées ou mockées.

### 3.3 Démarrer PostgreSQL (Docker)

```bash
pnpm docker:up
# ou : docker compose up -d
```

Vérifier que PostgreSQL est prêt :
```bash
docker compose logs postgres
# Doit afficher : database system is ready to accept connections
```

Interface Adminer disponible sur [http://localhost:8080](http://localhost:8080) :
- Serveur : `postgres`
- Utilisateur : `primeo`
- Mot de passe : `primeo_dev`
- Base : `primeo_dev`

### 3.4 Générer le client Prisma

```bash
pnpm db:generate
```

### 3.5 Appliquer les migrations

```bash
pnpm db:migrate
# ou : bash scripts/migrate-all.sh development
```

### 3.6 Peupler la base de données (optionnel)

```bash
pnpm db:seed
# ou : bash scripts/seed-dev.sh
```

Crée des données de test : utilisateurs de tous types, propriétés, réservations, avis.

---

## 4. Démarrer les services

### Backend (API REST + Socket.io)

```bash
pnpm dev:backend
# Accessible sur http://localhost:3000
# Swagger UI : http://localhost:3000/api-docs
```

### Dashboard Admin

```bash
pnpm dev:admin
# Accessible sur http://localhost:3001
```

---

## 5. Vérifications

```bash
# Healthcheck complet
bash scripts/healthcheck.sh http://localhost:3000

# Tests backend
pnpm test:backend

# Linting
pnpm lint
```

---

## 6. Commandes utiles

```bash
# Prisma Studio (interface visuelle de la DB)
pnpm db:studio

# Réinitialiser la base de données
pnpm db:reset

# Voir les logs Docker
pnpm docker:logs

# Stopper Docker
pnpm docker:down
```

---

## 7. Structure des ports locaux

| Service | Port | URL |
|---|---|---|
| Backend API | 3000 | http://localhost:3000 |
| Dashboard Admin | 3001 | http://localhost:3001 |
| PostgreSQL | 5432 | `postgresql://primeo:primeo_dev@localhost:5432/primeo_dev` |
| Adminer | 8080 | http://localhost:8080 |

---

## 8. Problèmes fréquents

**`pnpm install` échoue**
→ Vérifier que Node.js >= 20 est installé : `node -v`

**PostgreSQL ne démarre pas**
→ Vérifier que Docker Desktop est lancé : `docker ps`
→ Vérifier que le port 5432 est libre : `lsof -i :5432`

**Erreur `DATABASE_URL not found`**
→ Vérifier que `backend/.env` existe et contient `DATABASE_URL`

**Erreur Prisma `P1001` (connexion DB)**
→ Vérifier que Docker est bien lancé : `pnpm docker:up`
→ Attendre quelques secondes que PostgreSQL soit prêt

**Port 3000 déjà utilisé**
→ Modifier `PORT=3000` dans `backend/.env`
