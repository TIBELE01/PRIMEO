-- Envois groupés push / email depuis le dashboard admin (section « Communication »)
CREATE TABLE "admin_broadcasts" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "channels" TEXT[],
    "audience" TEXT NOT NULL,
    "recipientIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'processing',
    "totalRecipients" INTEGER NOT NULL DEFAULT 0,
    "pushSent" INTEGER NOT NULL DEFAULT 0,
    "pushSkipped" INTEGER NOT NULL DEFAULT 0,
    "emailSent" INTEGER NOT NULL DEFAULT 0,
    "emailFailed" INTEGER NOT NULL DEFAULT 0,
    "emailSkipped" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "admin_broadcasts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "admin_broadcasts_createdAt_idx" ON "admin_broadcasts"("createdAt");

-- Accès uniquement via l'API (service role), comme les autres tables
ALTER TABLE "admin_broadcasts" ENABLE ROW LEVEL SECURITY;
