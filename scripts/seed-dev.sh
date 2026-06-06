#!/usr/bin/env bash
# seed-dev.sh — Peuple la base de données de développement avec des données de test
set -euo pipefail

BLUE='\033[0;34m'; GREEN='\033[0;32m'; RED='\033[0;31m'; NC='\033[0m'
log() { echo -e "${BLUE}[seed]${NC} $1"; }
ok()  { echo -e "${GREEN}[seed]${NC} $1"; }
err() { echo -e "${RED}[seed]${NC} $1" >&2; exit 1; }

[ "${NODE_ENV:-development}" = "production" ] && err "Le seed est interdit en production"

log "Peuplement de la base de données de développement..."
cd backend
npx ts-node -r tsconfig-paths/register prisma/seed.ts

ok "Seed terminé — base de données peuplée avec des données de test"
