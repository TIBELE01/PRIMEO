// Admin auth controller — login, TOTP verify, session check (admin-only)
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../database/prisma.service';
import { supabaseAdmin, supabaseAuth } from '../../config/supabase.config';
import { redisSet, redisDel, redisGet } from '../../common/utils/redis-client';
import { verifyTotp as verifyTotpCode } from '../../common/utils/totp';
import { comparePassword } from '../../common/utils/bcrypt';
import { HttpError } from '../../common/handlers/http-error.handler';
import { logger } from '../../common/utils/logger';
import { AccountType, UserStatus } from '@prisma/client';

const TOTP_PENDING_TTL = 300;
const TOTP_PENDING_KEY = (userId: string) => `totp_pending:${userId}`;

function adminProfile(user: { id: string; email: string; firstName: string; lastName: string; accountType: string }) {
  return { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.accountType };
}

// Auto-provision: create Supabase user for an admin that only exists in Prisma (legacy seed)
async function provisionSupabaseAdmin(email: string, password: string): Promise<string | null> {
  try {
    // Check if already in Supabase (different error path)
    const { data: existing } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existing?.users?.find(u => u.email === email);
    if (existingUser) {
      // Update password and ensure role is set
      await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
        password,
        app_metadata: { role: 'admin' },
      });
      return existingUser.id;
    }

    // Create new Supabase user
    const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { role: 'admin' },
    });

    if (createError || !createData.user) {
      logger.error('provisionSupabaseAdmin createUser failed', { error: createError?.message });
      return null;
    }

    return createData.user.id;
  } catch (err) {
    logger.error('provisionSupabaseAdmin unexpected error', { error: (err as Error).message });
    return null;
  }
}

export async function adminLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body as { email: string; password: string };

    type SignInData = Awaited<ReturnType<typeof supabaseAuth.auth.signInWithPassword>>['data'];
    let signInData: SignInData = null as unknown as SignInData;

    const { data, error: signInError } = await supabaseAuth.auth.signInWithPassword({ email, password });

    if (signInError || !data.session || !data.user) {
      // Supabase doesn't know this user — check if it's a legacy Prisma-only admin
      const prismaAdmin = await prisma.user.findUnique({ where: { email } });
      if (!prismaAdmin || prismaAdmin.accountType !== AccountType.admin) {
        return next(new HttpError(401, 'Identifiants incorrects'));
      }

      // Validate password against Prisma hash (legacy)
      const validHash = prismaAdmin.passwordHash !== 'supabase_managed'
        && await comparePassword(password, prismaAdmin.passwordHash);
      if (!validHash) {
        return next(new HttpError(401, 'Identifiants incorrects'));
      }

      // First-time Supabase provisioning for this legacy admin
      const supabaseId = await provisionSupabaseAdmin(email, password);
      if (!supabaseId) {
        return next(new HttpError(500, 'Erreur provisionnement du compte administrateur. Contactez le support.'));
      }

      // Sync Prisma record: update ID to Supabase UUID if different
      if (prismaAdmin.id !== supabaseId) {
        try {
          await prisma.$executeRaw`UPDATE "users" SET id = ${supabaseId} WHERE email = ${email}`;
          logger.info('Admin Prisma ID migrated to Supabase UUID', { oldId: prismaAdmin.id, newId: supabaseId });
        } catch (err) {
          logger.warn('Admin Prisma ID migration failed (may already be synced)', { error: (err as Error).message });
        }
      }

      // Now sign in with Supabase
      const { data: retryData, error: retryError } = await supabaseAuth.auth.signInWithPassword({ email, password });
      if (retryError || !retryData.session || !retryData.user) {
        return next(new HttpError(500, 'Erreur de connexion après provisionnement. Réessayez.'));
      }
      signInData = retryData;
    } else {
      signInData = data;
    }

    // Vérification du rôle admin
    const role = signInData.user.app_metadata?.role as string | undefined;
    if (role !== 'admin') {
      await supabaseAdmin.auth.admin.signOut(signInData.session.access_token).catch(() => null);
      return next(new HttpError(403, 'Accès réservé aux administrateurs'));
    }

    const user = await prisma.user.findFirst({ where: { email: signInData.user.email! } });
    if (!user) {
      // Edge case: Supabase user exists but Prisma doesn't — create it
      await supabaseAdmin.auth.admin.getUserById(signInData.user.id);
      await prisma.user.create({
        data: {
          id: signInData.user.id,
          email: email,
          phone: '+2250000000000',
          passwordHash: 'supabase_managed',
          firstName: 'Super',
          lastName: 'Admin',
          accountType: AccountType.admin,
          status: UserStatus.active,
        },
      }).catch(() => null);
      const freshUser = await prisma.user.findFirst({ where: { email } });
      if (!freshUser) {
        await supabaseAdmin.auth.admin.signOut(signInData.session.access_token).catch(() => null);
        return next(new HttpError(401, 'Compte introuvable'));
      }
      return continueLogin(signInData, freshUser, res, next);
    }

    return continueLogin(signInData, user, res, next);
  } catch (err) {
    next(err);
  }
}

async function continueLogin(
  signInData: { session: { access_token: string; refresh_token: string }; user: { id: string; app_metadata?: Record<string, unknown> } },
  user: { id: string; email: string; firstName: string; lastName: string; accountType: string; twoFactorEnabled: boolean; twoFactorSecret: string | null },
  res: Response,
  _next: NextFunction,
): Promise<void> {
  // TOTP si activé
  if (user.twoFactorEnabled && user.twoFactorSecret) {
    await redisSet(
      TOTP_PENDING_KEY(user.id),
      JSON.stringify({ supabaseRefreshToken: signInData.session.refresh_token }),
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

    const { supabaseRefreshToken } = JSON.parse(pendingRaw) as { supabaseRefreshToken: string };

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.twoFactorSecret) return next(new HttpError(400, 'Utilisateur introuvable'));

    const isValid = verifyTotpCode(user.twoFactorSecret, token);
    if (!isValid) return next(new HttpError(401, 'Code TOTP incorrect ou expiré'));

    await redisDel(TOTP_PENDING_KEY(userId));

    const { data: refreshData, error: refreshError } = await supabaseAuth.auth.refreshSession({
      refresh_token: supabaseRefreshToken,
    });
    if (refreshError || !refreshData.session) return next(new HttpError(401, 'Session expirée. Reconnectez-vous.'));

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
