// Synchronisation des rôles entre la base (users.accountType) et Supabase
// (app_metadata.role). Le middleware d'authentification refuse tout JWT dont
// le rôle diverge de la base — cette routine garantit l'alignement des deux
// sources lors d'un changement de type de compte.
import { supabaseAdmin } from '../../config/supabase.config';
import { logger } from './logger';

/**
 * Aligne app_metadata.role côté Supabase sur le rôle applicatif donné.
 * À appeler après toute mise à jour de users.accountType.
 * Lève une erreur si Supabase refuse la mise à jour (l'appelant décide
 * d'annuler ou non le changement côté base).
 */
export async function syncSupabaseRole(userId: string, role: string): Promise<void> {
  const { data: { user: sbUser }, error: getErr } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (getErr || !sbUser) {
    throw new Error(`Utilisateur Supabase introuvable (${getErr?.message ?? 'not found'})`);
  }

  if (sbUser.app_metadata?.role === role) return; // déjà aligné

  const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    app_metadata: { ...sbUser.app_metadata, role },
  });
  if (updateErr) {
    throw new Error(`Échec mise à jour app_metadata.role : ${updateErr.message}`);
  }

  logger.info('Rôle Supabase synchronisé', { userId, role });
}
