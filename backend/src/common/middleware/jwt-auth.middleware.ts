// JWT authentication middleware — verifies Supabase access token and attaches user to request
import { Request, Response, NextFunction } from 'express';
import { HttpError } from '../handlers/http-error.handler';
import * as Sentry from '@sentry/node';
import { supabaseAdmin } from '../../config/supabase.config';
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

    const role = (user.app_metadata?.role as UserRole) ?? 'client';

    req.user = { sub: user.id, email: user.email ?? '', role };

    Sentry.setUser({ id: user.id, email: user.email, role });
    next();
  } catch {
    next(new HttpError(401, 'Invalid or expired access token'));
  }
}
