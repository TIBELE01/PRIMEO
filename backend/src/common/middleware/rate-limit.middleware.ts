// Rate limiting via express-rate-limit + store Upstash Redis (partagé inter-instances),
// avec repli sur un compteur en mémoire quand Redis est absent ou indisponible.
import { Application, Request, Response } from 'express';
import { rateLimit, Store, IncrementResponse } from 'express-rate-limit';
import { getRedisClient } from '../utils/redis-client';
import { redisConfig } from '../../config/redis.config';
import { logger } from '../utils/logger';

// ─── Compteur en mémoire (repli) ──────────────────────────────────────────────
//
// Utilisé quand Redis n'est pas configuré ou ne répond pas. Limite par instance
// (non partagée), mais une limite réelle : l'ancien repli renvoyait toujours
// « 1 requête », ce qui désactivait entièrement le rate limiting sans Redis.

const memoryHits = new Map<string, { count: number; resetAt: number }>();
const MEMORY_SWEEP_INTERVAL_MS = 60_000;

const sweepTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of memoryHits) {
    if (entry.resetAt <= now) memoryHits.delete(key);
  }
}, MEMORY_SWEEP_INTERVAL_MS);
sweepTimer.unref(); // ne retient pas le processus (arrêt propre, tests)

function memoryIncrement(key: string, windowMs: number): IncrementResponse {
  const now = Date.now();
  const entry = memoryHits.get(key);
  if (!entry || entry.resetAt <= now) {
    const fresh = { count: 1, resetAt: now + windowMs };
    memoryHits.set(key, fresh);
    return { totalHits: 1, resetTime: new Date(fresh.resetAt) };
  }
  entry.count += 1;
  return { totalHits: entry.count, resetTime: new Date(entry.resetAt) };
}

function memoryDecrement(key: string): void {
  const entry = memoryHits.get(key);
  if (entry && entry.count > 0) entry.count -= 1;
}

// ─── Store Upstash Redis pour express-rate-limit ──────────────────────────────
//
// Fenêtre fixe (fixed window) avec INCR + EXPIRE, partagée entre instances.
// Si Redis est absent ou indisponible, repli sur le compteur en mémoire.

export class UpstashRedisStore implements Store {
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
    const key = this.key(rawKey);
    const client = getRedisClient();
    if (!client) return memoryIncrement(key, this.windowMs);

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
      logger.warn('Upstash rate-limit store error — repli sur le compteur en mémoire', {
        error: (err as Error).message,
      });
      return memoryIncrement(key, this.windowMs);
    }
  }

  async decrement(rawKey: string): Promise<void> {
    const key = this.key(rawKey);
    const client = getRedisClient();
    if (!client) {
      memoryDecrement(key);
      return;
    }
    try {
      const current = await client.get(key) as number | null;
      if (current !== null && Number(current) > 0) {
        await client.decr(key);
      }
    } catch (err) {
      logger.warn('Upstash rate-limit decrement error', { error: (err as Error).message });
      memoryDecrement(key);
    }
  }

  async resetKey(rawKey: string): Promise<void> {
    const key = this.key(rawKey);
    memoryHits.delete(key);
    const client = getRedisClient();
    if (!client) return;
    try {
      await client.del(key);
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
  // req.ip est fiable grâce à « trust proxy » (app.ts) : Express ne retient que
  // l'adresse ajoutée par le proxy de confiance. Lire soi-même le premier
  // élément de X-Forwarded-For laissait le client choisir sa clé — donc
  // contourner la limite en changeant l'en-tête à chaque requête.
  keyGenerator: (req: Request) => req.ip ?? req.socket?.remoteAddress ?? 'unknown',
  handler: (_req: Request, res: Response) => {
    res.status(429).json({
      error: 'Trop de tentatives de connexion. Veuillez réessayer dans 15 minutes.',
      code: 'RATE_LIMIT_EXCEEDED',
    });
  },
});
