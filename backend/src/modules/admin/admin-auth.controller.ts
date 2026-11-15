// Admin auth controller — login, TOTP verify, session check (admin-only)
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../database/prisma.service';
import { supabaseAdmin, supabaseAuth } from '../../config/supabase.config';
import { redisSet, redisDel, redisGet } from '../../common/utils/redis-client';
import { encryptSecret, decryptSecret } from '../../common/utils/secret-crypto';
import { verifyTotp as verifyTotpCode } from '../../common/utils/totp';
import { HttpError } from '../../common/handlers/http-error.handler';
import { logger } from '../../common/utils/logger';
import { AccountType, UserStatus } from '@prisma/client';
import { readTwoFactor, writeTwoFactor, markSessionVerified } from '../../common/utils/two-factor';
import { getFailedAttempts, recordFailedAttempt, clearFailedAttempts } from '../../common/utils/attempt-limiter';
import { TOTP_MAX_ATTEMPTS, TOTP_ATTEMPT_WINDOW_SECONDS } from '../auth/two-factor.service';
import { getAccountBlock } from '../../common/utils/account-status';

const TOTP_LOGIN_SCOPE = 'totp_login';

const TOTP_PENDING_TTL = 300;
const TOTP_PENDING_KEY = (userId: string) => `totp_pending:${userId}`;

function adminProfile(user: { id: string; email: string; firstName: string; lastName: string; accountType: string; adminRole?: string | null }) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    // Rôle granulaire admin exposé au dashboard (RBAC UI). null ⇒ super_admin.
    role: user.accountType === 'admin' ? (user.adminRole ?? 'super_admin') : user.accountType,
  };
}

export async function adminLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body as { email: string; password: string };

    const { data: signInData, error: signInError } = await supabaseAuth.auth.signInWithPassword({ email, password });

    if (signInError || !signInData.session || !signInData.user) {
      return next(new HttpError(401, 'Identifiants incorrects'));
    }

    // Vérification du rôle admin
    const role = signInData.user.app_metadata?.role as string | undefined;
    if (role !== 'admin') {
      await supabaseAdmin.auth.admin.signOut(signInData.session.access_token).catch(() => null);
      return next(new HttpError(403, 'Accès réservé aux administrateurs'));
    }

    let user = await prisma.user.findFirst({ where: { email: signInData.user.email! } });
    if (!user) {
      // Edge case: Supabase user exists but Prisma doesn't — create it
      await prisma.user.create({
        data: {
          id: signInData.user.id,
          email: email,
          phone: null,
          firstName: 'Super',
          lastName: 'Admin',
          accountType: AccountType.admin,
          status: UserStatus.active,
        },
      }).catch(() => null);
      user = await prisma.user.findFirst({ where: { email } });
      if (!user) {
        await supabaseAdmin.auth.admin.signOut(signInData.session.access_token).catch(() => null);
        return next(new HttpError(401, 'Compte introuvable'));
      }
    }

    // Compte administrateur désactivé par un super-admin → refus
    const block = getAccountBlock(user);
    if (block) {
      await supabaseAdmin.auth.admin.signOut(signInData.session.access_token).catch(() => null);
      return next(new HttpError(403, block.message, { code: block.code }));
    }

    return continueLogin(signInData, user, res, next);
  } catch (err) {
    next(err);
  }
}

async function continueLogin(
  signInData: { session: { access_token: string; refresh_token: string }; user: { id: string; app_metadata?: Record<string, unknown> } },
  user: { id: string; email: string; firstName: string; lastName: string; accountType: string; adminRole?: string | null },
  res: Response,
  _next: NextFunction,
): Promise<void> {
  // Lire les données 2FA depuis Supabase user_metadata
  const { data: { user: sbUser } } = await supabaseAdmin.auth.admin.getUserById(signInData.user.id);
  const twoFactor = readTwoFactor(sbUser);

  // Reprise des comptes configurés avant le passage à app_metadata
  if (twoFactor.enabled && twoFactor.legacy && sbUser) {
    await writeTwoFactor(sbUser, { enabled: true, secret: twoFactor.secret })
      .catch((err) => logger.warn('Migration 2FA admin vers app_metadata échouée', { userId: user.id, error: (err as Error).message }));
  }

  if (twoFactor.enabled) {
    // Refresh token chiffré (AES-256-GCM) avant stockage en Redis,
    // et supprimé immédiatement après usage dans adminVerifyTotp.
    await redisSet(
      TOTP_PENDING_KEY(user.id),
      encryptSecret(JSON.stringify({ supabaseRefreshToken: signInData.session.refresh_token })),
      TOTP_PENDING_TTL,
    );
    res.json({ requiresTwoFactor: true, tempToken: user.id });
    return;
  }

  logger.info('Admin login', { userId: user.id });
  res.json({ accessToken: signInData.session.access_token, admin: adminProfile(user) });
}


export async function adminVerifyTotp(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { token, tempToken: userId } = req.body as { token: string; tempToken: string };

    const pendingRaw = await redisGet(TOTP_PENDING_KEY(userId));
    if (!pendingRaw) return next(new HttpError(400, 'Session 2FA expirée. Reconnectez-vous.'));

    const { supabaseRefreshToken } = JSON.parse(decryptSecret(pendingRaw)) as { supabaseRefreshToken: string };

    // Essais bornés par compte, indépendamment de l'IP
    if ((await getFailedAttempts(TOTP_LOGIN_SCOPE, userId)) >= TOTP_MAX_ATTEMPTS) {
      await redisDel(TOTP_PENDING_KEY(userId));
      return next(new HttpError(429, 'Trop de codes incorrects. Reconnectez-vous dans 15 minutes.'));
    }

    const { data: { user: sbUser } } = await supabaseAdmin.auth.admin.getUserById(userId);
    const twoFactorSecret = readTwoFactor(sbUser).secret;
    if (!twoFactorSecret) return next(new HttpError(400, 'Utilisateur introuvable'));

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return next(new HttpError(400, 'Utilisateur introuvable'));

    const isValid = verifyTotpCode(twoFactorSecret, token);
    if (!isValid) {
      const attempts = await recordFailedAttempt(TOTP_LOGIN_SCOPE, userId, TOTP_ATTEMPT_WINDOW_SECONDS);
      if (attempts >= TOTP_MAX_ATTEMPTS) {
        await redisDel(TOTP_PENDING_KEY(userId));
        return next(new HttpError(429, 'Trop de codes incorrects. Reconnectez-vous dans 15 minutes.'));
      }
      return next(new HttpError(401, 'Code TOTP incorrect ou expiré'));
    }

    await clearFailedAttempts(TOTP_LOGIN_SCOPE, userId);
    await redisDel(TOTP_PENDING_KEY(userId));

    const { data: refreshData, error: refreshError } = await supabaseAuth.auth.refreshSession({
      refresh_token: supabaseRefreshToken,
    });
    if (refreshError || !refreshData.session) return next(new HttpError(401, 'Session expirée. Reconnectez-vous.'));

    // Cette session a passé le second facteur : elle seule sera acceptée par l'API.
    await markSessionVerified(refreshData.session.access_token);

    logger.info('Admin TOTP verified', { userId: user.id });
    res.json({ accessToken: refreshData.session.access_token, admin: adminProfile(user) });
  } catch (err) {
    next(err);
  }
}

export async function adminMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
    if (!user) return next(new HttpError(404, 'Compte introuvable'));
    res.json(adminProfile(user));
  } catch (err) {
    next(err);
  }
}
