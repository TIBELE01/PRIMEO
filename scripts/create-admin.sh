#!/usr/bin/env bash
# create-admin.sh — Crée un compte administrateur en ligne de commande
# Usage : bash scripts/create-admin.sh
set -euo pipefail

BLUE='\033[0;34m'; GREEN='\033[0;32m'; RED='\033[0;31m'; NC='\033[0m'
log() { echo -e "${BLUE}[admin]${NC} $1"; }
ok()  { echo -e "${GREEN}[admin]${NC} $1"; }
err() { echo -e "${RED}[admin]${NC} $1" >&2; exit 1; }

[ -z "${DATABASE_URL:-}" ] && [ -f backend/.env ] && export $(grep -v '^#' backend/.env | xargs)
[ -z "${DATABASE_URL:-}" ] && err "DATABASE_URL non définie. Renseignez backend/.env"

read -r -p "Prénom : " FIRST_NAME
read -r -p "Nom : " LAST_NAME
read -r -p "Email : " EMAIL
read -r -p "Téléphone (+225XXXXXXXXXX) : " PHONE
read -r -s -p "Mot de passe (min. 12 caractères) : " PASSWORD
echo ""

[ ${#PASSWORD} -lt 12 ] && err "Mot de passe trop court (minimum 12 caractères)"

log "Création du compte administrateur..."
cd backend
npx ts-node -r tsconfig-paths/register -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();
async function main() {
  const hash = await bcrypt.hash('$PASSWORD', 12);
  const user = await prisma.user.create({
    data: {
      first_name: '$FIRST_NAME',
      last_name: '$LAST_NAME',
      email: '$EMAIL',
      phone: '$PHONE',
      password_hash: hash,
      account_type: 'admin',
      status: 'active',
    },
  });
  console.log('Compte admin créé :', user.email);
  await prisma.\$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
"

ok "Compte administrateur créé pour : $EMAIL"
