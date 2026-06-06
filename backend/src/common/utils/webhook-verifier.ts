// HMAC SHA-256 webhook signature verification, timestamp validation, and nonce anti-replay.
// Used by Genius Pay and OneSignal webhook handlers.
import crypto from 'crypto';
import { redisSet, redisGet } from './redis-client';
import { logger } from './logger';

const NONCE_TTL_SECONDS = 300;          // 5 minutes — matches timestamp window
const TIMESTAMP_WINDOW_MS = 5 * 60_000; // 5 minutes anti-replay window

export function computeHmacSha256(payload: string | Buffer, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

export function verifyHmacSignature(
  payload: Buffer,
  receivedSignature: string,
  secret: string,
): boolean {
  const expected = computeHmacSha256(payload, secret);
  try {
    // timingSafeEqual requires equal-length buffers; mismatched lengths → false
    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(receivedSignature.replace(/^sha256=/, ''), 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// Returns false if the timestamp (Unix seconds) is missing, in the future by more
// than 60 s (clock skew), or older than TIMESTAMP_WINDOW_MS.
export function verifyTimestamp(ts: number | string | undefined): boolean {
  if (ts === undefined || ts === null || ts === '') return false;
  const epoch = typeof ts === 'string' ? parseInt(ts, 10) : ts;
  if (!Number.isFinite(epoch)) return false;
  const ageMs = Date.now() - epoch * 1000;
  return ageMs >= -60_000 && ageMs <= TIMESTAMP_WINDOW_MS;
}

// Stores nonce in Redis to prevent replay attacks.
// namespace should be the provider prefix (e.g. 'gp' for Genius Pay, 'os' for OneSignal)
// so two different providers cannot share nonce space.
export async function checkNonce(nonce: string, namespace = 'default'): Promise<boolean> {
  const key = `webhook:nonce:${namespace}:${nonce}`;
  const exists = await redisGet(key);
  if (exists) {
    logger.warn(`Duplicate webhook nonce — ns=${namespace} nonce=${nonce}`);
    return false;
  }
  await redisSet(key, '1', NONCE_TTL_SECONDS);
  return true;
}
