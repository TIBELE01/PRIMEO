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
  async processGeniusPay(
    body: unknown,
    signature: string,
    rawBody: Buffer,
    ip?: string,
    meta: { timestamp?: string; event?: string; delivery?: string } = {},
  ): Promise<void> {
    const secret = geniusPayConfig.webhookSecret;
    if (!secret) throw new HttpError(500, 'Genius Pay webhook secret not configured');
    const payload = (body ?? {}) as Record<string, unknown>;

    // ── 1. HMAC-SHA256 ─────────────────────────────────────────────────────
    // Format officiel : HMAC(timestamp + "." + payload JSON) avec l'horodatage de l'en-tête
    // X-Webhook-Timestamp. Le JSON signé est celui envoyé (corps brut) ; par prudence on
    // accepte aussi sa forme ré-encodée « à la PHP » (barres obliques échappées). Ancien
    // format (HMAC du corps brut seul) toujours accepté.
    const raw = rawBody.toString('utf8');
    const candidates: Buffer[] = [];
    if (meta.timestamp) {
      const compact = JSON.stringify(payload);
      for (const json of new Set([raw, compact, compact.replace(/\//g, '\\/')])) {
        candidates.push(Buffer.from(`${meta.timestamp}.${json}`, 'utf8'));
      }
    }
    candidates.push(rawBody);
    const isValid = candidates.some((c) => verifyHmacSignature(c, signature, secret));
    if (!isValid) {
      logger.warn(`Genius Pay webhook invalid signature — ip=${ip ?? 'unknown'}`);
      throw new HttpError(401, 'Invalid webhook signature');
    }

    // ── 2. Timestamp anti-replay (±5 min) ──────────────────────────────────
    // En-tête X-Webhook-Timestamp, sinon champ « timestamp » du corps.
    const timestamp = meta.timestamp ?? (payload['timestamp'] as number | string | undefined);
    if (!verifyTimestamp(timestamp)) {
      logger.warn(`Genius Pay webhook timestamp invalid or too old — ip=${ip ?? 'unknown'} ts=${timestamp}`);
      throw new HttpError(400, 'Webhook timestamp missing or outside acceptable window');
    }

    // ── 3. Déduplication (id d'événement, id de livraison ou nonce) ───────
    const nonce = (payload['id'] ?? meta.delivery ?? payload['nonce']) as string | undefined;
    if (nonce) {
      const isNew = await checkNonce(String(nonce), 'gp');
      if (!isNew) throw new HttpError(409, 'Duplicate webhook event');
    }

    const event = (payload['event'] as string | undefined) ?? meta.event;
    const data = (payload['data'] ?? payload) as Record<string, unknown>;

    logger.info(`Genius Pay webhook — event=${event ?? 'unknown'} ip=${ip ?? 'unknown'}`);

    switch (event) {
      case 'payment.success':
        await handlePaymentSuccess(data);
        break;
      case 'payment.failed':
      case 'payment.cancelled':
      case 'payment.expired':
        await handlePaymentFailed(data);
        break;
      case 'payment.refunded':
        await handlePaymentRefunded(data);
        break;
      case 'webhook.test':
        logger.info('Genius Pay webhook de test reçu et vérifié');
        break;
      default:
        logger.info(`Genius Pay event ignoré : ${event}`);
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
    } else if (env.NODE_ENV === 'production') {
      // Production sans secret : on refuse (appel non authentifiable).
      logger.warn(`OneSignal webhook refusé : ONESIGNAL_WEBHOOK_SECRET non défini — ip=${ip ?? 'unknown'}`);
      throw new HttpError(401, 'OneSignal webhook signature not configured');
    } else {
      logger.warn('ONESIGNAL_WEBHOOK_SECRET not set — webhook signature check skipped (dev/test)');
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

    await handleOneSignalEvent(payload as unknown as OneSignalEvent);
  },
};
