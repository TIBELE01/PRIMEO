// JWT authentication middleware — verifies Supabase access token and attaches user to request
import { Request, Response, NextFunction } from 'express';
import { HttpError } from '../handlers/http-error.handler';
import * as Sentry from '@sentry/node';
import { supabaseAdmin } from '../../config/supabase.config';
import { prisma } from '../../database/prisma.service';
import { logger } from '../utils/logger';
import { UserRole } from '../constants/roles';
import { getAccountBlock } from '../utils/account-status';
import { isTwoFactorEnforced, isSessionVerified } from '../utils/two-factor';

// Seule route accessible à un compte désactivé volontairement : sa réactivation.
const SELF_REACTIVATE_PATH = '/api/users/me/reactivate';

export interface TokenPayload {
  sub: string;
  email: string;
  role: UserRole;
}

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return next(new HttpError(401, 'Connexion requise'));
    }

    const token = authHeader.split(' ')[1];

    // Verify the Supabase JWT via the auth server (also detects revoked tokens)
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return next(new HttpError(401, 'Session expirée ou invalide. Veuillez vous reconnecter.'));
    }

    const supabaseRole = (user.app_metadata?.role as UserRole) ?? 'client';

    // Cohérence des rôles : le rôle du JWT Supabase (app_metadata.role) doit
    // correspondre au rôle stocké en base (users.accountType). Une divergence
    // signifie une élévation de privilège potentielle → accès refusé + incident loggué.
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { accountType: true, status: true, suspendedByAdmin: true },
    });

    if (!dbUser) {
      logger.error('SECURITY: utilisateur Supabase sans entrée en base — accès refusé', {
        userId: user.id,
        email: user.email,
        supabaseRole,
        path: req.path,
      });
      return next(new HttpError(403, 'Compte introuvable. Contactez le support.'));
    }

    if (dbUser.accountType !== supabaseRole) {
      logger.error('SECURITY: incohérence de rôle Supabase ↔ base de données — accès refusé', {
        userId: user.id,
        email: user.email,
        supabaseRole,
        databaseRole: dbUser.accountType,
        path: req.path,
        ip: req.ip,
      });
      Sentry.captureMessage('Role mismatch Supabase vs database', {
        level: 'warning',
        extra: { userId: user.id, supabaseRole, databaseRole: dbUser.accountType, path: req.path },
      });
      return next(new HttpError(403, 'Incohérence de compte détectée. Contactez le support.'));
    }

    // Statut du compte : un compte banni ou suspendu ne peut plus utiliser l'API,
    // même avec un jeton encore valide. Exception : un compte désactivé
    // volontairement peut appeler sa propre réactivation.
    const block = getAccountBlock(dbUser);
    if (block) {
      const fullPath = `${req.baseUrl ?? ''}${req.path ?? ''}`.replace(/\/+$/, '');
      const isSelfReactivation =
        block.code === 'ACCOUNT_DEACTIVATED' && req.method === 'POST' && fullPath === SELF_REACTIVATE_PATH;
      if (!isSelfReactivation) {
        return next(new HttpError(403, block.message, { code: block.code }));
      }
    }

    // 2FA actif : seule une session ayant passé le second facteur est acceptée.
    // Une session ouverte en appelant Supabase directement (mot de passe seul)
    // possède un jeton valide mais n'a jamais validé de code TOTP.
    if (isTwoFactorEnforced(user) && !(await isSessionVerified(token))) {
      return next(
        new HttpError(401, 'Vérification en deux étapes requise. Reconnectez-vous.', { code: 'TWO_FACTOR_REQUIRED' }),
      );
    }

    const role = dbUser.accountType as UserRole;

    req.user = { sub: user.id, email: user.email ?? '', role };

    Sentry.setUser({ id: user.id, email: user.email, role });
    next();
  } catch (err) {
    if (err instanceof HttpError) return next(err);
    next(new HttpError(401, 'Session expirée ou invalide. Veuillez vous reconnecter.'));
  }
}

/**
 * Authentification facultative : si un jeton valide est fourni, `req.user` est renseigné ;
 * sinon (absent, expiré, invalide) la requête continue en anonyme. Utilisé par les routes
 * publiques qui adaptent leur comportement à l'utilisateur (ex. statistiques d'annonce).
 */
export async function optionalAuthenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.headers.authorization?.startsWith('Bearer ')) return next();
  await authenticate(req, res, (err?: unknown) => {
    if (err) req.user = undefined;
    next();
  });
}
