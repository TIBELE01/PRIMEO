#!/usr/bin/env bash
# migrate-all.sh — Applique les migrations Prisma sur l'environnement cible
# Usage : bash scripts/migrate-all.sh [development|staging|production]
set -euo pipefail

BLUE='\033[0;34m'; GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; NC='\033[0m'
log()  { echo -e "${BLUE}[migrate]${NC} $1"; }
ok()   { echo -e "${GREEN}[migrate]${NC} $1"; }
warn() { echo -e "${YELLOW}[migrate]${NC} $1"; }
err()  { echo -e "${RED}[migrate]${NC} $1" >&2; exit 1; }

ENV=${1:-development}

case "$ENV" in
  development)
    log "Migrations en développement..."
    cd backend && npx prisma migrate dev
    ;;
  staging|production)
    warn "Migrations sur $ENV — opération irréversible. Vérifiez DATABASE_URL avant de continuer."
    read -r -p "Confirmer ? (oui/non) : " CONFIRM
    [ "$CONFIRM" != "oui" ] && err "Annulé"
    [ -z "${DATABASE_URL:-}" ] && err "DATABASE_URL non définie"
    log "Application des migrations en $ENV (prisma migrate deploy)..."
    cd backend && npx prisma migrate deploy
    ok "Migrations appliquées en $ENV"
    ;;
  *)
    err "Usage : $0 [development|staging|production]"
    ;;
esac
