// Statut de compte — règles d'accès communes à l'API REST, au WebSocket et à l'auth.
//
// Deux situations partagent le statut `suspended` :
//   - suspension décidée par un administrateur (suspendedByAdmin = true) :
//     seul un admin peut la lever ;
//   - désactivation volontaire par l'utilisateur (suspendedByAdmin = false) :
//     le compte se réactive en se reconnectant ou via /users/me/reactivate.
import { supabaseAdmin } from '../../config/supabase.config';
import { logger } from './logger';

export interface AccountStatusFields {
  status?: string | null;
  suspendedByAdmin?: boolean | null;
}

export type AccountBlockCode = 'ACCOUNT_BANNED' | 'ACCOUNT_SUSPENDED' | 'ACCOUNT_DEACTIVATED';

export interface AccountBlock {
  code: AccountBlockCode;
  message: string;
}

/** Renvoie la raison du blocage du compte, ou null si le compte peut utiliser l'API. */
export function getAccountBlock(user: AccountStatusFields): AccountBlock | null {
  if (user.status === 'banned') {
    return { code: 'ACCOUNT_BANNED', message: 'Votre compte a été désactivé.' };
  }
  if (user.status === 'suspended') {
    return user.suspendedByAdmin
      ? { code: 'ACCOUNT_SUSPENDED', message: 'Votre compte est suspendu. Contactez le support.' }
      : { code: 'ACCOUNT_DEACTIVATED', message: 'Votre compte est désactivé. Reconnectez-vous pour le réactiver.' };
  }
  return null;
}

// ~100 ans : Supabase n'a pas de bannissement « définitif », seulement une durée.
const SUPABASE_BAN_DURATION = '876000h';

/**
 * Bloque (ou débloque) le compte côté Supabase Auth : un compte banni ne peut plus
 * ouvrir de session ni rafraîchir ses jetons, y compris en appelant Supabase
 * directement. Best-effort : l'accès à l'API reste de toute façon refusé par le
 * contrôle de statut en base (middleware authenticate).
 */
export async function setSupabaseBan(userId: string, banned: boolean): Promise<void> {
  try {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      ban_duration: banned ? SUPABASE_BAN_DURATION : 'none',
    });
    if (error) {
      logger.warn('Supabase : mise à jour du bannissement échouée', { userId, banned, error: error.message });
    }
  } catch (err) {
    logger.warn('Supabase : mise à jour du bannissement échouée', { userId, banned, error: (err as Error).message });
  }
}
