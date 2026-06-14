# Sauvegardes & restauration — Supabase

## État actuel (juin 2026)

Le projet Supabase (`qaiplagtbnxvctvpofuh`, région `eu-west-1`) est sur le **plan Free**.

| Fonctionnalité | Plan Free | Plan Pro |
|---|---|---|
| Sauvegardes quotidiennes | ✅ 7 jours | ✅ 30 jours |
| Point-in-Time Recovery (PITR) | ❌ | ✅ (extension payante) |
| Exports manuels | ✅ illimités | ✅ illimités |

**Le plan Free ne conserve les sauvegardes automatiques que 7 jours.**  
Pour atteindre une rétention de 30 jours, il faut passer au **plan Pro (25 $/mois)**.

---

## Vérifier les sauvegardes actives

1. Connectez-vous à [app.supabase.com](https://app.supabase.com)
2. Sélectionnez le projet **Primeo** (`qaiplagtbnxvctvpofuh`)
3. Allez dans **Settings → Database → Backups**
4. Vérifiez que les sauvegardes quotidiennes sont listées et que la dernière date d'hier

---

## Activer la rétention 30 jours (Plan Pro)

1. Dans Supabase Dashboard → **Settings → Billing → Upgrade to Pro**
2. Une fois sur Pro : **Settings → Database → Point in Time Recovery** → activer (option payante ~$100/mois)
   - Ou simplement laisser les **sauvegardes quotidiennes automatiques à 30 jours** (incluses dans Pro)

---

## Export manuel immédiat (workaround Free)

Pour compenser la limite de 7 jours, planifier un export hebdomadaire via `pg_dump` :

```bash
# Variables
export PGPASSWORD="<DB_PASSWORD>"
DB_HOST="db.qaiplagtbnxvctvpofuh.supabase.co"
DB_NAME="postgres"
DB_USER="postgres"
BACKUP_FILE="primeo_$(date +%Y%m%d_%H%M%S).sql.gz"

# Dump compressé
pg_dump -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" \
  --no-owner --no-acl -Fc \
  | gzip > "$BACKUP_FILE"

echo "Backup : $BACKUP_FILE"
```

Stocker le fichier dans un bucket Supabase Storage ou sur un service externe (S3, Google Drive).

---

## Restauration depuis une sauvegarde Supabase

### Via le Dashboard (recommandé)

1. **Settings → Database → Backups**
2. Cliquer sur **Restore** à côté de la sauvegarde souhaitée
3. Confirmer — la restauration prend ~5–15 minutes selon la taille

### Via `pg_restore` (backup manuel)

```bash
export PGPASSWORD="<DB_PASSWORD>"
pg_restore \
  -h "db.qaiplagtbnxvctvpofuh.supabase.co" \
  -U postgres \
  -d postgres \
  --clean --no-owner --no-acl \
  primeo_20260614_000000.sql.gz
```

> ⚠️ `--clean` supprime les objets existants avant restauration. Faire un export frais avant.

---

## Recommandation

Passer au **plan Pro Supabase** avant la mise en production publique pour bénéficier de :
- Sauvegardes automatiques 30 jours
- SLA 99,9 %
- Support par email

Coût estimé : **25 $/mois** (base) + extensions éventuelles.
