// Compteur d'essais infructueux (codes OTP / TOTP) par cible — indépendant de l'IP.
//
// Un code à 6 chiffres se devine en un million d'essais au plus : la limite par
// IP ne suffit pas (un attaquant change d'adresse). On borne donc le nombre
// d'essais par compte ou par numéro, quel que soit l'appelant.
// Compteur partagé entre instances via Redis ; repli en mémoire locale sinon.
import { getRedisClient } from './redis-client';
import { logger } from './logger';

const memory = new Map<string, { count: number; resetAt: number }>();

const keyOf = (scope: string, id: string): string => `attempts:${scope}:${id}`;

/** Nombre d'essais infructueux enregistrés dans la fenêtre en cours. */
export async function getFailedAttempts(scope: string, id: string): Promise<number> {
  const key = keyOf(scope, id);
  const client = getRedisClient();
  if (client) {
    try {
      const raw = await client.get<string>(key);
      return raw === null || raw === undefined ? 0 : Number(raw) || 0;
    } catch (err) {
      logger.warn('attempt-limiter : lecture Redis échouée — repli mémoire', { error: (err as Error).message });
    }
  }
  const entry = memory.get(key);
  if (!entry || Date.now() > entry.resetAt) return 0;
  return entry.count;
}

/** Enregistre un essai infructueux et renvoie le total dans la fenêtre. */
export async function recordFailedAttempt(scope: string, id: string, windowSeconds: number): Promise<number> {
  const key = keyOf(scope, id);
  const client = getRedisClient();
  if (client) {
    try {
      const count = (await client.incr(key)) as number;
      if (count === 1) await client.expire(key, windowSeconds);
      return count;
    } catch (err) {
      logger.warn('attempt-limiter : écriture Redis échouée — repli mémoire', { error: (err as Error).message });
    }
  }
  const now = Date.now();
  const entry = memory.get(key);
  if (!entry || now > entry.resetAt) {
    memory.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return 1;
  }
  entry.count += 1;
  return entry.count;
}

/** Remet le compteur à zéro (après un succès). */
export async function clearFailedAttempts(scope: string, id: string): Promise<void> {
  const key = keyOf(scope, id);
  memory.delete(key);
  const client = getRedisClient();
  if (client) {
    try {
      await client.del(key);
    } catch (err) {
      logger.warn('attempt-limiter : suppression Redis échouée', { error: (err as Error).message });
    }
  }
}
