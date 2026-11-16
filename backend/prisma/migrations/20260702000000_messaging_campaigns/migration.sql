-- Canaux de communication WhatsApp / Telegram (via Norasend) : campagnes d'envoi,
-- destinataires (statut par destinataire) et liste de désinscription.

DO $$ BEGIN
  CREATE TYPE "MessagingChannel" AS ENUM ('whatsapp', 'telegram');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "CampaignStatus" AS ENUM ('processing', 'completed', 'partial', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "CampaignRecipientStatus" AS ENUM ('pending', 'sent', 'failed', 'skipped');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "messaging_campaigns" (
  "id" TEXT NOT NULL,
  "channel" "MessagingChannel" NOT NULL,
  "mode" TEXT NOT NULL,
  "title" TEXT,
  "text" TEXT NOT NULL,
  "mediaUrl" TEXT,
  "parseMode" TEXT,
  "status" "CampaignStatus" NOT NULL DEFAULT 'processing',
  "totalRecipients" INTEGER NOT NULL DEFAULT 0,
  "sentCount" INTEGER NOT NULL DEFAULT 0,
  "failedCount" INTEGER NOT NULL DEFAULT 0,
  "skippedCount" INTEGER NOT NULL DEFAULT 0,
  "delayMs" INTEGER NOT NULL DEFAULT 0,
  "consentConfirmed" BOOLEAN NOT NULL DEFAULT false,
  "error" TEXT,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "messaging_campaigns_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "messaging_campaigns_createdAt_idx" ON "messaging_campaigns"("createdAt");
CREATE INDEX IF NOT EXISTS "messaging_campaigns_channel_status_idx" ON "messaging_campaigns"("channel", "status");

CREATE TABLE IF NOT EXISTS "messaging_campaign_recipients" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "recipient" TEXT NOT NULL,
  "variables" JSONB,
  "status" "CampaignRecipientStatus" NOT NULL DEFAULT 'pending',
  "providerMessageId" TEXT,
  "error" TEXT,
  "sentAt" TIMESTAMP(3),
  CONSTRAINT "messaging_campaign_recipients_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "messaging_campaign_recipients_campaignId_status_idx" ON "messaging_campaign_recipients"("campaignId", "status");

DO $$ BEGIN
  ALTER TABLE "messaging_campaign_recipients" ADD CONSTRAINT "messaging_campaign_recipients_campaignId_fkey"
    FOREIGN KEY ("campaignId") REFERENCES "messaging_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "messaging_opt_outs" (
  "id" TEXT NOT NULL,
  "channel" "MessagingChannel" NOT NULL,
  "recipient" TEXT NOT NULL,
  "reason" TEXT,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "messaging_opt_outs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "messaging_opt_outs_channel_recipient_key" ON "messaging_opt_outs"("channel", "recipient");

-- Accès réservé au backend (rôle propriétaire) : RLS activée, sans policy pour anon/authenticated.
ALTER TABLE "messaging_campaigns" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "messaging_campaign_recipients" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "messaging_opt_outs" ENABLE ROW LEVEL SECURITY;
