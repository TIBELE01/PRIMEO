-- Migration : table sms_logs pour les logs d'envoi SMS Orange et les delivery reports

-- CreateEnum
CREATE TYPE "sms_log_status" AS ENUM ('pending', 'sent', 'delivered', 'failed', 'expired');

-- CreateTable: sms_logs
CREATE TABLE "sms_logs" (
    "id"          TEXT NOT NULL,
    "recipient"   TEXT NOT NULL,
    "message"     TEXT NOT NULL,
    "status"      "sms_log_status" NOT NULL DEFAULT 'pending',
    "requestId"   TEXT,
    "errorCode"   TEXT,
    "isOtp"       BOOLEAN NOT NULL DEFAULT false,
    "sentAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),
    "updatedAt"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sms_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sms_logs_recipient_idx" ON "sms_logs"("recipient");
CREATE INDEX "sms_logs_requestId_idx" ON "sms_logs"("requestId");
