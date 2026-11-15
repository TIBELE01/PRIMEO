-- Distingue la suspension décidée par un administrateur de la désactivation
-- volontaire du compte par l'utilisateur. Les deux partageaient le statut
-- « suspended », ce qui permettait à un compte suspendu par un admin de se
-- réactiver lui-même via POST /api/users/me/reactivate.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "suspendedByAdmin" BOOLEAN NOT NULL DEFAULT false;

-- Reprise de l'existant : un compte actuellement suspendu est marqué « suspendu
-- par un admin » si sa dernière entrée d'audit pertinente est une suspension
-- admin (et non une désactivation volontaire).
UPDATE "users" u
SET "suspendedByAdmin" = true
WHERE u."status" = 'suspended'
  AND (
    SELECT a."action"
    FROM "audit_logs" a
    WHERE (a."action" = 'admin.user.suspend' AND a."targetId" = u."id")
       OR (a."action" = 'user.deactivated'   AND a."userId"   = u."id")
    ORDER BY a."createdAt" DESC
    LIMIT 1
  ) = 'admin.user.suspend';

-- Les comptes administrateurs ne se désactivent pas eux-mêmes : un compte admin
-- suspendu l'a été par un super-admin (PATCH /api/admin/accounts/:id).
UPDATE "users"
SET "suspendedByAdmin" = true
WHERE "status" = 'suspended' AND "accountType" = 'admin';
