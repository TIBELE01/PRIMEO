// JWT strategy helper — Supabase token verification
import { supabaseAdmin } from '../../../config/supabase.config';
import { TokenPayload } from '../../../common/middleware/jwt-auth.middleware';

export async function extractJwtPayload(token: string): Promise<TokenPayload | null> {
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) return null;
    return {
      sub: user.id,
      email: user.email ?? '',
      role: (user.app_metadata?.role as TokenPayload['role']) ?? 'client',
    };
  } catch {
    return null;
  }
}
