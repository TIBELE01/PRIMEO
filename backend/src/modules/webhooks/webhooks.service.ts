// Webhooks service — HMAC verification, timestamp anti-replay, idempotent event processing.
// Both Genius Pay and OneSignal share the same security pipeline:
//   1. HMAC-SHA256 on raw body
//   2. Timestamp window check (±5 minutes)
//   3. Nonce deduplication in Redis (TTL 5 min, namespaced per provider)
//   4. Structured logging of any rejection with IP address
import { verifyHmacSignature, verifyTimestamp, checkNonce } from '../../common/utils/webhook-verifier';
import { geniusPayConfig } from '../../config/genius-pay.config';
import { env } from '../../config/env.config';
import { HttpError } from '../../common/handlers/http-error.handler';
import { logger } from '../../common/utils/logger';
import {
  handlePaymentSuccess,
  handlePaymentFailed,
  handlePaymentRefunded,
} from './handlers/genius-pay.handler';
import { handleOneSignalEvent, type OneSignalEvent } from './handlers/onesignal.handler';

export const webhooksService = {
  async processGeniusPay(body: unknown, signature: string, rawBody: Buffer, ip?: string): Promise<void> {
    const secret = geniusPayConfig.webhookSecret;
    if (!secret) throw new HttpError(500, 'Genius Pay webhook secret not configured');

    // ── 1. HMAC-SHA256 signature ───────────────────────────────────────────
    const isValid = verifyHmacSignature(rawBody, signature, secret);
    if (!isValid) {
      logger.warn(`Genius Pay webhook invalid signature — ip=${ip ?? 'unknown'}`);
      throw new HttpError(401, 'Invalid webhook signature');
    }

    const payload = body as Record<string, unknown>;

    // ── 2. Timestamp anti-replay ───────────────────────────────────────────
    // Reject payloads whose timestamp is missing or outside the ±5 min window.
    // This prevents an attacker who captured a valid signed request from replaying
    // it later (signature alone does not expire).
    const timestamp = payload['timestamp'] as number | string | undefined;
    if (!verifyTimestamp(timestamp)) {
      logger.warn(`Genius Pay webhook timestamp invalid or too old — ip=${ip ?? 'unknown'} ts=${timestamp}`);
      throw new HttpError(400, 'Webhook timestamp missing or outside acceptable window');
    }

    // ── 3. Nonce deduplication ─────────────────────────────────────────────
    const nonce = payload['nonce'] as string | undefined;
    if (nonce) {
      const isNew = await checkNonce(nonce, 'gp');
      if (!isNew) throw new HttpError(409, 'Duplicate webhook event');
    }

    const event = payload['event'] as string | undefined;
    const data = (payload['data'] ?? payload) as Record<string, unknown>;

    logger.info(`Genius Pay webhook — event=${event ?? 'unknown'} ip=${ip ?? 'unknown'}`);

    switch (event) {
      case 'payment.success':
        await handlePaymentSuccess(data);
        break;
      case 'payment.failed':
        await handlePaymentFailed(data);
        break;
      case 'payment.refunded':
        await handlePaymentRefunded(data);
        break;
      default:
        logger.warn(`Unhandled Genius Pay event: ${event}`);
    }
  },

  async processOneSignal(body: unknown, signature: string | undefined, rawBody: Buffer, ip?: string): Promise<void> {
    const secret = env.ONESIGNAL_WEBHOOK_SECRET;

    // ── 1. HMAC-SHA256 signature ───────────────────────────────────────────
    if (secret) {
      // Secret configured: enforce signature. Reject if header is absent or invalid.
      if (!signature) {
        logger.warn(`OneSignal webhook missing X-OneSignal-Signature — ip=${ip ?? 'unknown'}`);
        throw new HttpError(401, 'Missing OneSignal signature header');
      }
      const isValid = verifyHmacSignature(rawBody, signature, secret);
      if (!isValid) {
        logger.warn(`OneSignal webhook invalid signature — ip=${ip ?? 'unknown'}`);
        throw new HttpError(401, 'Invalid OneSignal webhook signature');
      }
    } else {
      // Secret not configured: log warning but continue (graceful degradation until
      // ONESIGNAL_WEBHOOK_SECRET is set in the environment).
      logger.warn('ONESIGNAL_WEBHOOK_SECRET not set — webhook signature check skipped');
    }

    const payload = body as Record<string, unknown>;

    // ── 2. Timestamp anti-replay ───────────────────────────────────────────
    const timestamp = payload['timestamp'] as number | string | undefined;
    if (timestamp !== undefined && !verifyTimestamp(timestamp)) {
      logger.warn(`OneSignal webhook timestamp invalid — ip=${ip ?? 'unknown'} ts=${timestamp}`);
      throw new HttpError(400, 'Webhook timestamp outside acceptable window');
    }

    // ── 3. Nonce deduplication using notification_id ───────────────────────
    const notificationId =
      (payload['notification_id'] ?? payload['id']) as string | undefined;
    if (notificationId) {
      const isNew = await checkNonce(notificationId, 'os');
      if (!isNew) throw new HttpError(409, 'Duplicate OneSignal event');
    }

    const event = payload['event'] as string | undefined;
    logger.info(`OneSignal webhook — event=${event ?? 'unknown'} ip=${ip ?? 'unknown'}`);

    handleOneSignalEvent(payload as unknown as OneSignalEvent);
  },
};
