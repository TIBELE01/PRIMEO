// Service 2FA (TOTP) — configuration, activation, désactivation, révocation admin.
// Point d'entrée unique pour /users/me/2fa/*, /professional/totp/* et l'admin.
import { prisma } from '../../database/prisma.service';
import { supabaseAdmin } from '../../config/supabase.config';
import { HttpError } from '../../common/handlers/http-error.handler';
import { generateTotpSecret, generateTotpUri, generateQrCode, verifyTotp } from '../../common/utils/totp';
import {
  readTwoFactor,
  writeTwoFactor,
  isTwoFactorAvailable,
  markSessionVerified,
  type SupabaseUserLike,
} from '../../common/utils/two-factor';
import { getFailedAttempts, recordFailedAttempt, clearFailedAttempts } from '../../common/utils/attempt-limiter';

// Essais de code autorisés par compte avant blocage temporaire
export const TOTP_MAX_ATTEMPTS = 5;
export const TOTP_ATTEMPT_WINDOW_SECONDS = 15 * 60;
const MANAGE_SCOPE = 'totp_manage';

async function loadSupabaseUser(userId: string): Promise<SupabaseUserLike> {
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (error || !data?.user) throw new HttpError(404, 'Utilisateur introuvable');
  return data.user as SupabaseUserLike;
}

/** Vérifie un code TOTP en bornant le nombre d'essais par compte. */
async function assertValidCode(userId: string, secret: string, token: string): Promise<void> {
  if ((await getFailedAttempts(MANAGE_SCOPE, userId)) >= TOTP_MAX_ATTEMPTS) {
    throw new HttpError(429, 'Trop de codes incorrects. Réessayez dans 15 minutes.');
  }
  if (!verifyTotp(secret, token)) {
    await recordFailedAttempt(MANAGE_SCOPE, userId, TOTP_ATTEMPT_WINDOW_SECONDS);
    throw new HttpError(400, 'Code TOTP incorrect ou expiré');
  }
  await clearFailedAttempts(MANAGE_SCOPE, userId);
}

export const twoFactorService = {
  /** Démarre la configuration : génère un secret (non actif tant qu'il n'est pas confirmé). */
  async setup(userId: string): Promise<{ secret: string; qrCode: string }> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new HttpError(404, 'Utilisateur introuvable');

    if (!isTwoFactorAvailable()) {
      throw new HttpError(503, 'La double authentification est momentanément indisponible.');
    }

    const sbUser = await loadSupabaseUser(userId);
    // Un 2FA déjà actif ne se remplace pas sans passer par la désactivation
    // (qui exige un code valide) : sinon un simple appel à /setup le neutralisait.
    if (readTwoFactor(sbUser).enabled) {
      throw new HttpError(409, 'La double authentification est déjà activée. Désactivez-la d\'abord pour la reconfigurer.');
    }

    const secret = generateTotpSecret();
    await writeTwoFactor(sbUser, { enabled: false, secret });

    const uri = generateTotpUri(secret, user.email);
    const qrCode = await generateQrCode(uri);
    return { secret, qrCode };
  },

  /** Confirme le secret en attente avec un premier code valide → 2FA actif. */
  async confirm(userId: string, token: string, accessToken?: string): Promise<void> {
    if (!isTwoFactorAvailable()) {
      throw new HttpError(503, 'La double authentification est momentanément indisponible.');
    }

    const sbUser = await loadSupabaseUser(userId);
    const state = readTwoFactor(sbUser);
    if (state.enabled) throw new HttpError(409, 'La double authentification est déjà activée.');
    if (!state.secret) throw new HttpError(400, 'Configuration 2FA non initialisée. Appelez d\'abord /2fa/setup.');

    await assertValidCode(userId, state.secret, token);

    // La session courante vient de prouver la possession du second facteur :
    // on l'enregistre AVANT d'activer le 2FA, sinon elle serait refusée aussitôt.
    if (accessToken) await markSessionVerified(accessToken);
    await writeTwoFactor(sbUser, { enabled: true, secret: state.secret });
  },

  /** Désactive le 2FA — exige un code TOTP valide. */
  async disable(userId: string, token: string | undefined): Promise<void> {
    const sbUser = await loadSupabaseUser(userId);
    const state = readTwoFactor(sbUser);
    if (!state.enabled) throw new HttpError(400, 'Le 2FA n\'est pas activé sur ce compte');

    if (!token) {
      throw new HttpError(400, 'Le code de votre application d\'authentification est requis pour désactiver le 2FA.');
    }
    if (!state.secret) {
      throw new HttpError(409, 'Secret 2FA illisible. Contactez le support pour réinitialiser la double authentification.');
    }
    await assertValidCode(userId, state.secret, token);

    await writeTwoFactor(sbUser, { enabled: false, secret: null });
  },

  /** Révocation par un administrateur (perte de l'appareil) — sans code. */
  async revokeByAdmin(userId: string): Promise<void> {
    const sbUser = await loadSupabaseUser(userId);
    if (!readTwoFactor(sbUser).enabled) throw new HttpError(400, 'Le 2FA n\'est pas activé sur ce compte');
    await writeTwoFactor(sbUser, { enabled: false, secret: null });
    await clearFailedAttempts(MANAGE_SCOPE, userId);
  },
};
