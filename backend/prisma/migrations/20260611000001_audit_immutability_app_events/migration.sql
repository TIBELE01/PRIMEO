-- Journal d'audit : immuabilité + archivage (rétention 1 an) + événements analytics anonymisés.

-- ─── Table d'archive des logs d'audit ────────────────────────────────────────
-- Reçoit les entrées de plus d'un an déplacées par archive_old_audit_logs().
-- Pas de clé étrangère vers users : l'archive doit survivre à la suppression des comptes.
CREATE TABLE IF NOT EXISTS "audit_logs_archive" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "description" TEXT,
    "ipAddress" TEXT,
    "targetType" TEXT,
    "targetId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_archive_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "audit_logs_archive_createdAt_idx" ON "audit_logs_archive"("createdAt");
CREATE INDEX IF NOT EXISTS "audit_logs_archive_action_idx" ON "audit_logs_archive"("action");

ALTER TABLE "audit_logs_archive" ENABLE ROW LEVEL SECURITY;

-- ─── Immuabilité : interdiction d'UPDATE/DELETE sur les logs d'audit ─────────
-- DELETE autorisé uniquement quand le GUC local app.audit_archival vaut 'on'
-- (positionné exclusivement par archive_old_audit_logs dans sa transaction).
CREATE OR REPLACE FUNCTION audit_logs_block_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'audit_logs est immuable : UPDATE interdit';
  END IF;
  IF COALESCE(current_setting('app.audit_archival', true), '') <> 'on' THEN
    RAISE EXCEPTION 'audit_logs est immuable : DELETE interdit hors archivage';
  END IF;
  RETURN OLD;
END $$;

DROP TRIGGER IF EXISTS audit_logs_immutable ON "audit_logs";
CREATE TRIGGER audit_logs_immutable
  BEFORE UPDATE OR DELETE ON "audit_logs"
  FOR EACH ROW EXECUTE FUNCTION audit_logs_block_mutation();

DROP TRIGGER IF EXISTS audit_logs_archive_immutable ON "audit_logs_archive";
CREATE TRIGGER audit_logs_archive_immutable
  BEFORE UPDATE OR DELETE ON "audit_logs_archive"
  FOR EACH ROW EXECUTE FUNCTION audit_logs_block_mutation();

-- ─── Archivage automatique (rétention paramétrable, 1 an par défaut) ─────────
CREATE OR REPLACE FUNCTION archive_old_audit_logs(retention interval DEFAULT interval '1 year')
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE moved integer;
BEGIN
  PERFORM set_config('app.audit_archival', 'on', true);
  WITH old AS (
    DELETE FROM audit_logs
    WHERE "createdAt" < now() - retention
    RETURNING id, "userId", action, description, "ipAddress", "targetType", "targetId", metadata, "createdAt"
  )
  INSERT INTO audit_logs_archive (id, "userId", action, description, "ipAddress", "targetType", "targetId", metadata, "createdAt")
  SELECT id, "userId", action, description, "ipAddress", "targetType", "targetId", metadata, "createdAt" FROM old;
  GET DIAGNOSTICS moved = ROW_COUNT;
  PERFORM set_config('app.audit_archival', '', true);
  RETURN moved;
END $$;

-- Réservée au backend (service_role) : jamais exposée aux clients API
REVOKE EXECUTE ON FUNCTION archive_old_audit_logs(interval) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION archive_old_audit_logs(interval) FROM anon;
REVOKE EXECUTE ON FUNCTION archive_old_audit_logs(interval) FROM authenticated;

-- ─── Événements analytics anonymisés (mobile + vitrine) ──────────────────────
-- Aucune donnée personnelle : pas d'userId, pas d'IP — uniquement un identifiant
-- de session aléatoire généré côté client (réinitialisé à chaque installation).
CREATE TABLE IF NOT EXISTS "app_events" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "platform" TEXT,
    "role" TEXT,
    "sessionId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "app_events_name_createdAt_idx" ON "app_events"("name", "createdAt");

ALTER TABLE "app_events" ENABLE ROW LEVEL SECURITY;
