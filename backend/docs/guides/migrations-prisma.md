# Guide — Migrations Prisma (déploiement sûr)

Date : 2026-06-07

Ce guide décrit le passage de `prisma db push` à `prisma migrate deploy` et la
procédure de gestion des migrations versionnées en développement et en production.

---

## 1. Pourquoi ce changement

`prisma db push --accept-data-loss` synchronisait le schéma sans historique :
- ignore les migrations versionnées ;
- `--accept-data-loss` peut supprimer des colonnes/données silencieusement ;
- rollback impossible, pas de traçabilité.

`prisma migrate deploy` applique les migrations du dossier `prisma/migrations/`
de manière séquentielle, idempotente et tracée dans la table `_prisma_migrations`.

La commande de build Render a été mise à jour (`render.yaml`) :

```diff
- npx prisma db push --accept-data-loss --skip-generate
+ npx prisma migrate deploy
```

---

## 2. Baseline (effectué une fois, le 2026-06-07)

La base de production n'avait **pas** de table `_prisma_migrations` (db push).
Un `migrate deploy` naïf aurait tenté de rejouer `initial_schema` sur des tables
existantes → échec. On a donc **baseliné** la base : marquer comme « appliquées »
les migrations déjà reflétées par le schéma.

- Script : [`prisma/baseline.sql`](../../prisma/baseline.sql) (métadonnées uniquement,
  aucune donnée applicative touchée, idempotent).
- 20 migrations marquées appliquées.
- **Dérive `20260606000003`** : les colonnes `reviews.cuisineRating / serviceRating /
  ambianceRating` manquaient en production (dérive db push). Cette migration a été
  **appliquée manuellement via MCP le 2026-06-07** (SQL idempotent `IF NOT EXISTS`,
  non destructif) puis enregistrée dans `_prisma_migrations`. Résultat : les
  **21 migrations** sont désormais suivies et le prochain `migrate deploy` est un
  no-op (aucune migration pending) — état stable et sûr.

Procédure officielle équivalente si la CLI a un accès réseau direct à la base :

```bash
for m in 20260524000000_initial_schema ... 20260606000002_property_type_specific_fields; do
  npx prisma migrate resolve --applied "$m"
done
# Ne PAS résoudre 20260606000003 : laisser migrate deploy l'appliquer.
```

---

## 3. Dérive corrigée

| Élément | Schéma attendu | Production (avant) | Après `migrate deploy` |
|---|---|---|---|
| `reviews.cuisineRating` | présent | **absent** | créé ✓ |
| `reviews.serviceRating` | présent | **absent** | créé ✓ |
| `reviews.ambianceRating` | présent | **absent** | créé ✓ |

Colonnes créées le 2026-06-07 (vérifié : `review_cols = 3`, `migrations_tracked = 21`).
Tout le reste du schéma était déjà conforme (vérifié colonne par colonne).

---

## 4. Migration dupliquée corrigée

Deux migrations partageaient le préfixe `20260606000002` (ordre non déterministe
et déroutant). La seconde a été renommée :

```
20260606000002_restaurant_review_criteria_and_immo_available_from
  → 20260606000003_restaurant_review_criteria_and_immo_available_from
```

Renommage effectué via `git mv` (historique préservé). Comme cette migration
n'avait jamais été enregistrée dans `_prisma_migrations` (db push), le renommage
n'introduit aucun conflit côté production.

---

## 5. Cycle de travail

### Développement (local)

```bash
# Crée une nouvelle migration à partir des changements de schema.prisma
npx prisma migrate dev --name <description_courte>
```

`migrate dev` crée le fichier de migration, l'applique en local et régénère le client.

### Vérification avant déploiement

```bash
npx prisma migrate status   # doit afficher "Database schema is up to date"
```

### Production / CI (automatique via render.yaml)

```bash
npx prisma generate && npx prisma migrate deploy
```

`migrate deploy` n'applique que les migrations *pending*, ne demande jamais de
confirmation et n'efface jamais de données de lui-même.

---

## 6. Règles de sécurité

1. **Sauvegarde avant toute migration destructive.** Supabase fournit des backups
   automatiques ; pour une suppression de colonne, déclencher un backup manuel
   (Dashboard → Database → Backups) avant le déploiement.
2. **Jamais de `--accept-data-loss` en production.**
3. **Suppression de colonne en deux temps** (expand/contract) :
   - étape 1 : cesser d'utiliser la colonne dans le code, déployer ;
   - étape 2 : migration qui `DROP COLUMN`, après backup.
4. **Tester d'abord en staging** : pointer une base staging (copie) et exécuter
   `migrate deploy` avant la production.
5. **Rollback** : Prisma n'a pas de « down ». Pour annuler, créer une migration
   corrective (forward-only) ou restaurer le backup.
