// 2FA (TOTP) — stockage du secret et suivi des sessions vérifiées.
//
// Stockage : Supabase `app_metadata` (modifiable uniquement avec la clé service
// role), secret chiffré en AES-256-GCM. L'ancien emplacement, `user_metadata`,
// est modifiable par l'utilisateur lui-même avec son jeton et exposait le secret
// en clair : il n'est plus lu que pour reprendre les comptes déjà configurés
// (lecture « legacy »), migrés vers app_metadata à leur prochaine connexion.
//
// Sessions vérifiées : l'ouverture de session Supabase (mot de passe) ne connaît
// pas le TOTP applicatif. Pour qu'une session obtenue en appelant Supabase
// directement ne contourne pas le second facteur, chaque session ayant réussi
// le TOTP est enregistrée dans Redis (par `session_id` du JWT). Les comptes dont
// le 2FA est actif ne sont acceptés par l'API que sur une session enregistrée.
import { supabaseAdmin } from '../../config/supabase.config';
import { encryptSecret, decryptSecret } from './secret-crypto';
import { getRedisClient, redisGet, redisSet } from './redis-client';
import { logger } from './logger';

export interface SupabaseUserLike {
  id: string;
  app_metadata?: Record<string, unknown> | null;
  user_metadata?: Record<string, unknown> | null;
}

export interface TwoFactorState {
  /** 2FA actif (secret présent et confirmé). */
  enabled: boolean;
  /** Secret TOTP en clair (base32), ou null. Présent aussi pendant la configuration. */
  secret: string | null;
  /** true si l'état provient de l'ancien emplacement user_metadata. */
  legacy: boolean;
}

/** Lit l'état 2FA d'un utilisateur Supabase (app_metadata, sinon ancien user_metadata). */
export function readTwoFactor(sbUser: SupabaseUserLike | null | undefined): TwoFactorState {
  const app = (sbUser?.app_metadata ?? {}) as Record<string, unknown>;

  if (typeof app.twoFactorEnabled === 'boolean' || typeof app.twoFactorSecret === 'string') {
    let secret: string | null = null;
    if (typeof app.twoFactorSecret === 'string' && app.twoFactorSecret) {
      try {
        secret = decryptSecret(app.twoFactorSecret);
      } catch {
        // Secret illisible (ex. rotation de la clé service role) : le 2FA reste
        // marqué actif — un admin doit le révoquer — mais aucun code ne passera.
        logger.error('2FA : secret TOTP illisible', { userId: sbUser?.id });
      }
    }
    return { enabled: app.twoFactorEnabled === true, secret, legacy: false };
  }

  const legacy = (sbUser?.user_metadata ?? {}) as Record<string, unknown>;
  const legacySecret = typeof legacy.twoFactorSecret === 'string' && legacy.twoFactorSecret ? legacy.twoFactorSecret : null;
  return {
    enabled: legacy.twoFactorEnabled === true && !!legacySecret,
    secret: legacySecret,
    legacy: legacy.twoFactorEnabled !== undefined || !!legacySecret,
  };
}

/** Indique, à partir du seul app_metadata (présent dans getUser), si le 2FA est actif. */
export function isTwoFactorEnforced(sbUser: SupabaseUserLike | null | undefined): boolean {
  return (sbUser?.app_metadata as Record<string, unknown> | undefined)?.twoFactorEnabled === true;
}

/**
 * Écrit l'état 2FA dans app_metadata (secret chiffré) et efface toute trace de
 * l'ancien emplacement user_metadata.
 */
export async function writeTwoFactor(
  sbUser: SupabaseUserLike,
  state: { enabled: boolean; secret: string | null },
): Promise<void> {
  const { error } = await supabaseAdmin.auth.admin.updateUserById(sbUser.id, {
    app_metadata: {
      ...(sbUser.app_metadata ?? {}),
      twoFactorEnabled: state.enabled,
      twoFactorSecret: state.secret ? encryptSecret(state.secret) : null,
    },
    user_metadata: {
      ...(sbUser.user_metadata ?? {}),
      twoFactorEnabled: null,
      twoFactorSecret: null,
    },
  });
  if (error) throw new Error(`Mise à jour 2FA Supabase échouée : ${error.message}`);
}

// ── Sessions ayant passé le second facteur ────────────────────────────────────

// Durée pendant laquelle une session vérifiée reste acceptée sans nouveau TOTP.
const VERIFIED_SESSION_TTL_SECONDS = 60 * 24 * 3600; // 60 jours
// Cache local : évite un aller-retour Redis à chaque requête d'un compte 2FA.
const LOCAL_CACHE_TTL_MS = 5 * 60_000;
const verifiedCache = new Map<string, number>();

const sessionKey = (sessionId: string): string => `2fa_session:${sessionId}`;

/** Extrait le `session_id` d'un jeton d'accès Supabase (déjà validé par ailleurs). */
export function getSessionId(accessToken: string | undefined | null): string | null {
  if (!accessToken) return null;
  const parts = accessToken.split('.');
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as { session_id?: unknown };
    return typeof payload.session_id === 'string' && payload.session_id ? payload.session_id : null;
  } catch {
    return null;
  }
}

/** Le 2FA nécessite Redis (session en attente à la connexion + sessions vérifiées). */
export function isTwoFactorAvailable(): boolean {
  return getRedisClient() !== null;
}

/** Enregistre la session du jeton comme ayant passé le second facteur. */
export async function markSessionVerified(accessToken: string): Promise<void> {
  const sessionId = getSessionId(accessToken);
  if (!sessionId) {
    logger.warn('2FA : jeton sans session_id — session non enregistrée comme vérifiée');
    return;
  }
  await redisSet(sessionKey(sessionId), '1', VERIFIED_SESSION_TTL_SECONDS);
  verifiedCache.set(sessionId, Date.now() + LOCAL_CACHE_TTL_MS);
}

/**
 * Vrai si la session du jeton a passé le second facteur.
 * Redis injoignable (panne) → on laisse passer avec un avertissement, pour ne pas
 * couper tous les comptes 2FA ; session inconnue de Redis → refus.
 */
export async function isSessionVerified(accessToken: string): Promise<boolean> {
  const sessionId = getSessionId(accessToken);
  if (!sessionId) return false;

  const cachedUntil = verifiedCache.get(sessionId);
  if (cachedUntil && cachedUntil > Date.now()) return true;

  try {
    const found = await redisGet(sessionKey(sessionId));
    if (found) {
      verifiedCache.set(sessionId, Date.now() + LOCAL_CACHE_TTL_MS);
      return true;
    }
    verifiedCache.delete(sessionId);
    return false;
  } catch (err) {
    logger.warn('2FA : Redis injoignable — contrôle de session vérifiée ignoré', {
      error: (err as Error).message,
    });
    return true;
  }
}
