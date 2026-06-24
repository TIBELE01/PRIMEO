-- Rôle admin granulaire (super_admin | moderateur | support | analyste) pour la
-- gestion des comptes administrateurs. Nullable (null ⇒ traité comme super_admin).
-- Idempotent : sans effet si la colonne existe déjà (ajoutée hors-Prisma au besoin).
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "adminRole" TEXT;

-- Les comptes admin existants sans rôle granulaire deviennent super_admin.
UPDATE "users" SET "adminRole" = 'super_admin'
WHERE "accountType" = 'admin' AND "adminRole" IS NULL;
