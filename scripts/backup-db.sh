#!/usr/bin/env bash
# backup-db.sh — Export PostgreSQL vers un fichier SQL daté
# Usage : bash scripts/backup-db.sh [output-dir]
set -euo pipefail

BLUE='\033[0;34m'; GREEN='\033[0;32m'; RED='\033[0;31m'; NC='\033[0m'
log() { echo -e "${BLUE}[backup]${NC} $1"; }
ok()  { echo -e "${GREEN}[backup]${NC} $1"; }
err() { echo -e "${RED}[backup]${NC} $1" >&2; exit 1; }

command -v pg_dump >/dev/null 2>&1 || err "pg_dump introuvable. Installez postgresql-client."

[ -z "${DATABASE_URL:-}" ] && [ -f backend/.env ] && export $(grep -v '^#' backend/.env | xargs)
[ -z "${DATABASE_URL:-}" ] && err "DATABASE_URL non définie"

OUTPUT_DIR=${1:-./backups}
mkdir -p "$OUTPUT_DIR"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="${OUTPUT_DIR}/primeo_backup_${TIMESTAMP}.sql"

log "Export de la base de données vers $FILENAME..."
pg_dump "$DATABASE_URL" \
  --format=plain \
  --no-owner \
  --no-privileges \
  --verbose \
  > "$FILENAME"

FILESIZE=$(du -sh "$FILENAME" | cut -f1)
ok "Backup terminé : $FILENAME ($FILESIZE)"
log "Pour restaurer : psql \$DATABASE_URL < $FILENAME"
