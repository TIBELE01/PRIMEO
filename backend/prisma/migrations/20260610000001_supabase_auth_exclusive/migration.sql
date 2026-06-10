-- Migration: Remove legacy auth columns — Supabase Auth is now the exclusive auth mechanism.
-- Removes custom password hash, local reset tokens, OTP fields, and TOTP secrets from users.
-- Refresh tokens are managed by Supabase; the refresh_tokens table is dropped.

ALTER TABLE "users" DROP COLUMN IF EXISTS "passwordHash";
ALTER TABLE "users" DROP COLUMN IF EXISTS "resetToken";
ALTER TABLE "users" DROP COLUMN IF EXISTS "resetTokenExpiresAt";
ALTER TABLE "users" DROP COLUMN IF EXISTS "otpCode";
ALTER TABLE "users" DROP COLUMN IF EXISTS "otpExpiresAt";
ALTER TABLE "users" DROP COLUMN IF EXISTS "twoFactorEnabled";
ALTER TABLE "users" DROP COLUMN IF EXISTS "twoFactorSecret";

DROP TABLE IF EXISTS "refresh_tokens" CASCADE;
