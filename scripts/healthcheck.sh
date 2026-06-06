#!/usr/bin/env bash
# healthcheck.sh — Vérifie que le backend, la DB et Redis sont joignables
# Usage : bash scripts/healthcheck.sh [backend-url]
set -euo pipefail

BLUE='\033[0;34m'; GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; NC='\033[0m'
ok()   { echo -e "${GREEN}[OK]${NC}   $1"; }
fail() { echo -e "${RED}[FAIL]${NC} $1"; FAILED=$((FAILED + 1)); }
warn() { echo -e "${YELLOW}[SKIP]${NC} $1"; }

BACKEND_URL=${1:-http://localhost:3000}
FAILED=0

echo -e "${BLUE}=== Primeo Healthcheck ===${NC}"

# 1. Backend API
echo ""
echo "Backend : $BACKEND_URL/api/health"
if curl -sf --max-time 5 "$BACKEND_URL/api/health" > /dev/null 2>&1; then
  ok "Backend accessible"
else
  fail "Backend inaccessible ($BACKEND_URL/api/health)"
fi

# 2. Base de données PostgreSQL
echo ""
echo "Base de données PostgreSQL..."
[ -z "${DATABASE_URL:-}" ] && [ -f backend/.env ] && export $(grep -v '^#' backend/.env | xargs) 2>/dev/null || true

if [ -n "${DATABASE_URL:-}" ] && command -v psql >/dev/null 2>&1; then
  if psql "$DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1; then
    ok "PostgreSQL accessible"
  else
    fail "PostgreSQL inaccessible"
  fi
else
  warn "psql non disponible ou DATABASE_URL non définie — vérification DB ignorée"
fi

# 3. Upstash Redis (si configuré)
echo ""
echo "Upstash Redis..."
if [ -n "${UPSTASH_REDIS_REST_URL:-}" ] && [ -n "${UPSTASH_REDIS_REST_TOKEN:-}" ]; then
  REDIS_RESPONSE=$(curl -sf --max-time 5 \
    -H "Authorization: Bearer $UPSTASH_REDIS_REST_TOKEN" \
    "$UPSTASH_REDIS_REST_URL/ping" 2>/dev/null || echo "")
  if echo "$REDIS_RESPONSE" | grep -q "PONG"; then
    ok "Upstash Redis accessible"
  else
    fail "Upstash Redis inaccessible"
  fi
else
  warn "UPSTASH_REDIS_REST_URL non définie — Redis ignoré (optionnel en dev)"
fi

echo ""
echo "─────────────────────────────────"
if [ "$FAILED" -eq 0 ]; then
  echo -e "${GREEN}Tous les services sont opérationnels.${NC}"
  exit 0
else
  echo -e "${RED}$FAILED service(s) en échec.${NC}"
  exit 1
fi
