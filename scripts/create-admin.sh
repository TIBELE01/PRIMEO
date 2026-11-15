#!/usr/bin/env bash
# create-admin.sh — Crée un compte administrateur en ligne de commande.
# L'authentification passe exclusivement par Supabase Auth : le compte est créé
# dans Supabase (rôle admin) et dans la table users avec le même identifiant.
# Usage : bash scripts/create-admin.sh
set -euo pipefail

BLUE='\033[0;34m'; GREEN='\033[0;32m'; RED='\033[0;31m'; NC='\033[0m'
log() { echo -e "${BLUE}[admin]${NC} $1"; }
ok()  { echo -e "${GREEN}[admin]${NC} $1"; }
err() { echo -e "${RED}[admin]${NC} $1" >&2; exit 1; }

[ -f backend/.env ] || err "backend/.env introuvable (DATABASE_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY requis)"

read -r -p "Prénom : " NEW_ADMIN_FIRST_NAME
read -r -p "Nom : " NEW_ADMIN_LAST_NAME
read -r -p "Email : " NEW_ADMIN_EMAIL
read -r -p "Téléphone (+2250XXXXXXXXX, facultatif) : " NEW_ADMIN_PHONE
read -r -p "Rôle [super_admin] (super_admin | moderateur | support | analyste) : " NEW_ADMIN_ROLE
read -r -s -p "Mot de passe (min. 12 caractères) : " NEW_ADMIN_PASSWORD
echo ""

[ ${#NEW_ADMIN_PASSWORD} -lt 12 ] && err "Mot de passe trop court (minimum 12 caractères)"

# Les valeurs saisies sont transmises par variables d'environnement, jamais
# insérées dans du code exécuté.
export NEW_ADMIN_FIRST_NAME NEW_ADMIN_LAST_NAME NEW_ADMIN_EMAIL NEW_ADMIN_PHONE NEW_ADMIN_PASSWORD
export NEW_ADMIN_ROLE="${NEW_ADMIN_ROLE:-super_admin}"

log "Création du compte administrateur..."
cd backend
npx tsx scripts/create-admin.ts

ok "Terminé."
