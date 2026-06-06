// Idempotency middleware — prevents duplicate bookings / double charges on network retries.
// Clients send a unique `Idempotency-Key` header per booking attempt. The server:
//   - On first call  : processes normally, caches the 2xx response in Redis for 24 h.
//   - On duplicate   : returns the cached response immediately without re-processing.
//   - On Redis miss  : fails open (proceeds without cache — safe degradation).
// Only authenticated requests with a key are guarded; keyless calls pass through.
import { Request, Response, NextFunction } from 'express';
import { redisGet, redisSet } from '../utils/redis-client';
import { logger } from '../utils/logger';

const IDEMPOTENCY_TTL_SECONDS = 86_400; // 24 hours
const KEY_MAX_LENGTH = 128;

interface CachedResponse {
  statusCode: number;
  body: unknown;
}

export async function idempotency(req: Request, res: Response, next: NextFunction): Promise<void> {
  const rawKey = req.headers['idempotency-key'];
  const key = typeof rawKey === 'string' ? rawKey.trim() : undefined;

  // Pass through: no key supplied or user not yet authenticated
  if (!key || !req.user?.sub) {
    next();
    return;
  }

  if (key.length > KEY_MAX_LENGTH) {
    res.status(400).json({ message: `Idempotency-Key must not exceed ${KEY_MAX_LENGTH} characters` });
    return;
  }

  const redisKey = `idempotency:${req.user.sub}:${key}`;

  try {
    const cached = await redisGet(redisKey);
    if (cached) {
      const { statusCode, body } = JSON.parse(cached) as CachedResponse;
      logger.info(`Idempotency hit — key=${key} userId=${req.user.sub} → replaying ${statusCode}`);
      res.status(statusCode).json(body);
      return;
    }
  } catch (err) {
    // Redis unavailable — fail open so the booking can still proceed
    logger.warn('Idempotency Redis read failed, proceeding without idempotency cache', err);
    next();
    return;
  }

  // Intercept res.json to cache the first successful response
  const originalJson = res.json.bind(res) as (body?: unknown) => Response;
  res.json = function interceptedJson(body?: unknown): Response {
    const statusCode = res.statusCode ?? 200;
    if (statusCode >= 200 && statusCode < 300) {
      const payload: CachedResponse = { statusCode, body };
      redisSet(redisKey, JSON.stringify(payload), IDEMPOTENCY_TTL_SECONDS).catch((err) =>
        logger.warn(`Idempotency cache write failed — key=${key}`, err),
      );
    }
    return originalJson(body);
  };

  next();
}
