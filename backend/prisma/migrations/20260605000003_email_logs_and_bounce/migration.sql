-- Migration : table email_logs + champ emailBounced sur users

-- CreateEnum
CREATE TYPE "email_log_status" AS ENUM ('sent', 'failed', 'delivered', 'bounced', 'complained', 'opened');

-- AlterTable: users — ajout du flag emailBounced
ALTER TABLE "users" ADD COLUMN "emailBounced" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable: email_logs
CREATE TABLE "email_logs" (
    "id"           TEXT NOT NULL,
    "recipient"    TEXT NOT NULL,
    "subject"      TEXT NOT NULL,
    "templateId"   INTEGER,
    "status"       "email_log_status" NOT NULL DEFAULT 'sent',
    "errorMessage" TEXT,
    "messageId"    TEXT,
    "bounceCount"  INTEGER NOT NULL DEFAULT 0,
    "sentAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "email_logs_recipient_idx" ON "email_logs"("recipient");
CREATE INDEX "email_logs_messageId_idx" ON "email_logs"("messageId");
