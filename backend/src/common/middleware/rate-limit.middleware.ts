// Rate limiting via express-rate-limit + store Upstash Redis (partagé inter-instances)
import { Application, Request, Response } from 'express';
import { rateLimit, Store, IncrementResponse } from 'express-rate-limit';
import { getRedisClient } from '../utils/redis-client';
import { redisConfig } from '../../config/redis.config';
import { logger } from '../utils/logger';

// ─── Store Upstash Redis pour express-rate-limit ──────────────────────────────
//
// Utilise une fenêtre fixe (fixed window) avec INCR + EXPIREAT.
// Si Redis est indisponible, repli sur l'autorisation (fail open).

class UpstashRedisStore implements Store {
  readonly prefix: string;
  private windowMs: number;

  constructor(windowMs: number, prefix = 'rl:') {
    this.windowMs = windowMs;
    this.prefix = prefix;
  }

  private key(rawKey: string): string {
    return `${this.prefix}${rawKey}`;
  }

  async increment(rawKey: string): Promise<IncrementResponse> {
    const client = getRedisClient();
    if (!client) {
      // Pas de Redis configuré — autoriser (fail open)
      return { totalHits: 1, resetTime: undefined };
    }

    const key = this.key(rawKey);

    try {
      // INCR incrémente atomiquement; renvoie la nouvelle valeur
      const totalHits = await client.incr(key) as number;

      if (totalHits === 1) {
        // Premier hit de la fenêtre : poser le TTL
        const ttlSeconds = Math.ceil(this.windowMs / 1000);
        await client.expire(key, ttlSeconds);
      }

      const ttl = await client.ttl(key) as number;
      const resetTime = ttl > 0 ? new Date(Date.now() + ttl * 1000) : undefined;

      return { totalHits, resetTime };
    } catch (err) {
      logger.warn('Upstash rate-limit store error — fail open', {
        error: (err as Error).message,
      });
      return { totalHits: 1, resetTime: undefined };
    }
  }

  async decrement(rawKey: string): Promise<void> {
    const client = getRedisClient();
    if (!client) return;
    try {
      const key = this.key(rawKey);
      const current = await client.get(key) as number | null;
      if (current !== null && current > 0) {
        await client.decr(key);
      }
    } catch (err) {
      logger.warn('Upstash rate-limit decrement error', { error: (err as Error).message });
    }
  }

  async resetKey(rawKey: string): Promise<void> {
    const client = getRedisClient();
    if (!client) return;
    try {
      await client.del(this.key(rawKey));
    } catch (err) {
      logger.warn('Upstash rate-limit resetKey error', { error: (err as Error).message });
    }
  }
}

// ─── Rate limit global : 100 req/min par IP ───────────────────────────────────

const GLOBAL_WINDOW_MS = redisConfig.globalLimitWindow * 1000; // 60 000 ms

export function applyRateLimit(app: Application): void {
  app.use(
    rateLimit({
      windowMs: GLOBAL_WINDOW_MS,
      max: redisConfig.globalLimitMax,
      store: new UpstashRedisStore(GLOBAL_WINDOW_MS, 'rl:global:'),
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: 'Trop de requêtes. Veuillez réessayer dans une minute.' },
      skip: (req: Request) => req.path === '/api/health',
    })
  );
}

// ─── Rate limit auth : 5 tentatives / 15 min par IP ──────────────────────────
// §2.4 CONTEXTE.md : "cinq tentatives de connexion par IP sur quinze minutes"

const AUTH_WINDOW_MS = redisConfig.authLimitWindow * 1000; // 900 000 ms

export const authRateLimit = rateLimit({
  windowMs: AUTH_WINDOW_MS,
  max: redisConfig.authLimitMax,       // 5
  store: new UpstashRedisStore(AUTH_WINDOW_MS, 'rl:auth:'),
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,        // Ne compte que les échecs
  message: { error: 'Trop de tentatives. Réessayez dans 15 minutes.' },
  keyGenerator: (req: Request) => {
    // Utiliser le vrai IP même derrière un proxy (Render)
    const forwarded = req.headers['x-forwarded-for'];
    const ip = Array.isArray(forwarded) ? forwarded[0] : (forwarded?.split(',')[0] ?? req.ip ?? 'unknown');
    return ip.trim();
  },
  handler: (_req: Request, res: Response) => {
    res.status(429).json({
      error: 'Trop de tentatives de connexion. Veuillez réessayer dans 15 minutes.',
      code: 'RATE_LIMIT_EXCEEDED',
    });
  },
});
