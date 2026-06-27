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
