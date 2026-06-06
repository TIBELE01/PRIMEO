#!/usr/bin/env bash
# bootstrap.sh — Installation initiale complète du projet Primeo
set -euo pipefail

BLUE='\033[0;34m'; GREEN='\033[0;32m'; RED='\033[0;31m'; NC='\033[0m'
log() { echo -e "${BLUE}[bootstrap]${NC} $1"; }
ok()  { echo -e "${GREEN}[bootstrap]${NC} $1"; }
err() { echo -e "${RED}[bootstrap]${NC} $1" >&2; exit 1; }

command -v node >/dev/null 2>&1 || err "Node.js >= 20 requis"
command -v pnpm >/dev/null 2>&1 || err "pnpm >= 9 requis (npm install -g pnpm)"
command -v docker >/dev/null 2>&1 || err "Docker requis pour la base de données locale"

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
[ "$NODE_VERSION" -lt 20 ] && err "Node.js >= 20 requis (actuel : $(node -v))"

log "Installation des dépendances (tous les workspaces)..."
pnpm install

if [ ! -f backend/.env ]; then
  log "Création de backend/.env depuis .env.example..."
  cp .env.example backend/.env
  ok "backend/.env créé — renseignez vos clés API avant de continuer"
else
  log "backend/.env existe déjà — aucune modification"
fi

log "Démarrage de PostgreSQL (Docker)..."
docker compose up -d postgres

log "Attente de PostgreSQL..."
until docker compose exec -T postgres pg_isready -U primeo -d primeo_dev >/dev/null 2>&1; do
  sleep 2
done
ok "PostgreSQL prêt"

log "Génération du client Prisma..."
pnpm --filter backend prisma:generate

log "Application des migrations Prisma..."
pnpm --filter backend prisma:migrate

log "Peuplement de la base de données (seed dev)..."
pnpm --filter backend prisma:seed

ok "Bootstrap terminé ! Lancez le backend avec : pnpm dev:backend"
