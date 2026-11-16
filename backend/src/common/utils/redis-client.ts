// Upstash Redis REST client — used for rate limiting, OTP caching, session revocation
import { Redis } from '@upstash/redis';
import { redisConfig } from '../../config/redis.config';
import { logger } from './logger';

let redisClient: Redis | null = null;

export function getRedisClient(): Redis | null {
  if (!redisConfig.url || !redisConfig.token) {
    return null;
  }
  if (!redisClient) {
    redisClient = new Redis({
      url: redisConfig.url,
      token: redisConfig.token,
      // CRITIQUE : sans cela, le client fait JSON.parse sur les réponses GET et
      // transforme "123456" (OTP) en nombre 123456 → la comparaison stricte
      // `storedOtp !== input.otp` (string) échouait toujours (« Code invalide »).
      automaticDeserialization: false,
    });
    logger.debug('Upstash Redis client initialized');
  }
  return redisClient;
}

export async function redisSet(key: string, value: string, ttlSeconds?: number): Promise<void> {
  const client = getRedisClient();
  if (!client) return;
  if (ttlSeconds) {
    await client.set(key, value, { ex: ttlSeconds });
  } else {
    await client.set(key, value);
  }
}

export async function redisGet(key: string): Promise<string | null> {
  const client = getRedisClient();
  if (!client) return null;
  // Coercion défensive en chaîne : garantit que les clés numériques (ex : OTP)
  // ne reviennent jamais sous forme de nombre, quel que soit le réglage du client.
  const value = await client.get<string>(key);
  return value === null || value === undefined ? null : String(value);
}

export async function redisDel(key: string): Promise<void> {
  const client = getRedisClient();
  if (!client) return;
  await client.del(key);
}

// ── Cache « au mieux » ────────────────────────────────────────────────────────
// Pour les usages de pur cache (statistiques, taux de change) : une panne ou un
// refus de Redis ne doit JAMAIS faire échouer la requête — on se passe du cache.
// À ne pas utiliser pour les données dont dépend la sécurité (OTP, sessions 2FA,
// anti-rejeu) : celles-ci doivent voir l'erreur et décider elles-mêmes.

/** Lecture de cache : null si absent OU si Redis est indisponible. */
export async function cacheGet(key: string): Promise<string | null> {
  try {
    return await redisGet(key);
  } catch (err) {
    logger.warn('Cache Redis illisible — valeur ignorée', { key, error: (err as Error).message });
    return null;
  }
}

/** Écriture de cache : sans effet si Redis est indisponible ou en lecture seule. */
export async function cacheSet(key: string, value: string, ttlSeconds?: number): Promise<void> {
  try {
    await redisSet(key, value, ttlSeconds);
  } catch (err) {
    logger.warn('Cache Redis non écrit', { key, error: (err as Error).message });
  }
}

/** Invalidation de cache : sans effet si Redis est indisponible. */
export async function cacheDel(key: string): Promise<void> {
  try {
    await redisDel(key);
  } catch (err) {
    logger.warn('Cache Redis non invalidé', { key, error: (err as Error).message });
  }
}
