// JWT authentication middleware — verifies Supabase access token and attaches user to request
import { Request, Response, NextFunction } from 'express';
import { HttpError } from '../handlers/http-error.handler';
import * as Sentry from '@sentry/node';
import { supabaseAdmin } from '../../config/supabase.config';
import { prisma } from '../../database/prisma.service';
import { logger } from '../utils/logger';
import { UserRole } from '../constants/roles';

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
      return next(new HttpError(401, 'Missing or invalid Authorization header'));
    }

    const token = authHeader.split(' ')[1];

    // Verify the Supabase JWT via the auth server (also detects revoked tokens)
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return next(new HttpError(401, 'Invalid or expired access token'));
    }

    const supabaseRole = (user.app_metadata?.role as UserRole) ?? 'client';

    // Cohérence des rôles : le rôle du JWT Supabase (app_metadata.role) doit
    // correspondre au rôle stocké en base (users.accountType). Une divergence
    // signifie une élévation de privilège potentielle → accès refusé + incident loggué.
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { accountType: true },
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

    const role = dbUser.accountType as UserRole;

    req.user = { sub: user.id, email: user.email ?? '', role };

    Sentry.setUser({ id: user.id, email: user.email, role });
    next();
  } catch (err) {
    if (err instanceof HttpError) return next(err);
    next(new HttpError(401, 'Invalid or expired access token'));
  }
}
