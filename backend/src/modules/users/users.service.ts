// Users service — gestion complète du profil, désactivation, suppression
import { prisma } from '../../database/prisma.service';
import { HttpError } from '../../common/handlers/http-error.handler';
import { generateTotpSecret, generateTotpUri, generateQrCode, verifyTotp } from '../../common/utils/totp';
import { sendEmail } from '../../common/utils/mailer';
import { logger } from '../../common/utils/logger';
import { UpdateProfileInput, ChangePasswordInput, DeactivateInput, DeleteAccountInput } from './dto/users.dto';
import { supabaseAdmin, supabaseAuth } from '../../config/supabase.config';
import { cloudinaryPaths } from '../../config/cloudinary-paths';
import { renameCloudinaryAsset, setCloudinaryAssetFolder } from '../../common/utils/s3-client';
import type { AccountType } from '@prisma/client';

// Reclasse un avatar uploadé en staging vers Primeo/Users/<Type>/<userId>/profile.
// Best-effort : en cas d'échec, on conserve l'URL d'origine (toujours valide).
async function relocateAvatar(url: string, accountType: AccountType, userId: string): Promise<string> {
  if (!url.includes('res.cloudinary.com')) return url;
  const m = url.match(/\/upload\/(.+)$/);
  const pid = m ? m[1].replace(/^v\d+\//, '').replace(/\.[^./]+$/, '') : null;
  const target = cloudinaryPaths.userAvatar(accountType, userId);
  if (!pid || pid.startsWith(`${target}/`)) return url;
  try {
    const moved = await renameCloudinaryAsset(pid, `${target}/${pid.split('/').pop()}`, 'image');
    await setCloudinaryAssetFolder(moved.publicId, target, 'image').catch(() => {});
    return moved.url;
  } catch (err) {
    logger.warn('Reclassement avatar Cloudinary échoué — URL d\'origine conservée', err);
    return url;
  }
}

// ── Aide audit log ─────────────────────────────────────────────────────────────

async function writeAudit(userId: string, action: string, meta?: Record<string, unknown>) {
  try {
    await prisma.auditLog.create({
      data: { userId, action, description: meta?.description as string | undefined, metadata: meta ? JSON.parse(JSON.stringify(meta)) : undefined },
    });
  } catch (err) {
    logger.warn('Audit log non créé', err);
  }
}

// ── Aide email simple ──────────────────────────────────────────────────────────

function emailHtml(title: string, body: string): string {
  return `<!DOCTYPE html><html lang="fr"><body style="font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:40px 0;">
<table width="600" cellpadding="0" cellspacing="0" style="margin:auto;background:#fff;border-radius:8px;overflow:hidden;">
  <tr><td style="background:#03154A;padding:28px 36px;color:#fff;font-size:22px;font-weight:700;">PRIMEO</td></tr>
  <tr><td style="padding:36px;">
    <h2 style="color:#03154A;margin:0 0 16px;">${title}</h2>
    ${body}
  </td></tr>
  <tr><td style="background:#f9f9f9;padding:16px 36px;font-size:12px;color:#aaa;text-align:center;">
    © ${new Date().getFullYear()} Primeo CI — Abidjan, Côte d'Ivoire
  </td></tr>
</table></body></html>`;
}

// ── Service ────────────────────────────────────────────────────────────────────

const PRO_TYPES = ['professional_hebergement', 'professional_hotel', 'professional_immobilier', 'restaurateur'];

export const usersService = {

  // ── Lecture profil complet ────────────────────────────────────────────────

  async getById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        professionalProfile: { include: { documents: true } },
      },
    });
    if (!user) throw new HttpError(404, 'Utilisateur introuvable');
    return user;
  },

  // ── Mise à jour du profil ─────────────────────────────────────────────────

  async update(id: string, input: UpdateProfileInput) {
    const user = await prisma.user.findUnique({ where: { id }, select: { accountType: true, firstName: true, lastName: true, email: true } });
    if (!user) throw new HttpError(404, 'Utilisateur introuvable');

    // Champs User
    const userFields: Record<string, unknown> = {};
    if (input.firstName !== undefined)  userFields.firstName = input.firstName;
    if (input.lastName !== undefined)   userFields.lastName = input.lastName;
    if (input.phone !== undefined)      userFields.phone = input.phone;
    if (input.birthDate !== undefined)  userFields.birthDate = input.birthDate ? new Date(input.birthDate) : null;
    if (input.gender !== undefined)     userFields.gender = input.gender;
    if (input.avatarUrl !== undefined)  userFields.avatarUrl = input.avatarUrl
      ? await relocateAvatar(input.avatarUrl, user.accountType, id)
      : input.avatarUrl;

    const isPro = PRO_TYPES.includes(user.accountType);
    const proFields: Record<string, unknown> = {};
    if (isPro) {
      if (input.businessName !== undefined)   proFields.businessName = input.businessName!;
      if (input.rccm !== undefined)           proFields.rccm = input.rccm;
      if (input.taxId !== undefined)          proFields.taxId = input.taxId;
      if (input.touristLicense !== undefined) proFields.touristLicense = input.touristLicense;
      if (input.description !== undefined)    proFields.description = input.description;
      if (input.street !== undefined)         proFields.street = input.street;
      if (input.city !== undefined)           proFields.city = input.city;
    }

    await prisma.$transaction([
      prisma.user.update({ where: { id }, data: userFields as any }),
      ...(isPro && Object.keys(proFields).length > 0 ? [
        prisma.professionalProfile.upsert({
          where: { userId: id },
          create: { userId: id, businessName: proFields.businessName as string ?? '', ...proFields },
          update: proFields,
        }),
      ] : []),
    ]);

    await writeAudit(id, 'user.profile_updated', { fields: Object.keys(userFields).concat(Object.keys(proFields)) });

    return prisma.user.findUnique({
      where: { id },
      include: { professionalProfile: { include: { documents: true } } },
    });
  },

  // ── Changement de mot de passe ────────────────────────────────────────────

  async changePassword(id: string, input: ChangePasswordInput) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new HttpError(404, 'Utilisateur introuvable');

    // Valider le mot de passe actuel via Supabase
    const { error: signInError } = await supabaseAuth.auth.signInWithPassword({
      email: user.email,
      password: input.currentPassword,
    });
    if (signInError) throw new HttpError(400, 'Mot de passe actuel incorrect');

    // Mettre à jour dans Supabase Auth
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(id, {
      password: input.newPassword,
    });
    if (updateError) {
      logger.error('changePassword: erreur Supabase', { userId: id, error: updateError.message });
      throw new HttpError(500, 'Erreur lors de la mise à jour du mot de passe');
    }

    await writeAudit(id, 'user.password_changed');
    // Email de confirmation
    sendEmail({
      to: [{ email: user.email, name: `${user.firstName} ${user.lastName}` }],
      subject: 'Mot de passe modifié — Primeo',
      htmlContent: emailHtml(
        'Mot de passe modifié',
        `<p>Bonjour <strong>${user.firstName}</strong>,</p>
         <p>Votre mot de passe Primeo a été modifié avec succès.</p>
         <p>Si vous n'êtes pas à l'origine de cette modification, contactez-nous immédiatement à <a href="mailto:support@primeo.ci">support@primeo.ci</a>.</p>`,
      ),
    }).catch(() => null);
  },

  // ── Désactivation temporaire ──────────────────────────────────────────────

  async deactivate(id: string, input: DeactivateInput) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new HttpError(404, 'Utilisateur introuvable');
    if (user.status === 'suspended') throw new HttpError(409, 'Compte déjà désactivé');

    let deactivatedUntil: Date | null = null;
    if (input.duration === '1_week')   deactivatedUntil = new Date(Date.now() + 7  * 86_400_000);
    if (input.duration === '1_month')  deactivatedUntil = new Date(Date.now() + 30 * 86_400_000);

    await prisma.user.update({
      where: { id },
      data: { status: 'suspended', deactivatedUntil } as any,
    });

    await writeAudit(id, 'user.deactivated', { duration: input.duration, reason: input.reason });

    sendEmail({
      to: [{ email: user.email, name: `${user.firstName} ${user.lastName}` }],
      subject: 'Compte désactivé — Primeo',
      htmlContent: emailHtml(
        'Compte temporairement désactivé',
        `<p>Bonjour <strong>${user.firstName}</strong>,</p>
         <p>Votre compte Primeo a été désactivé ${input.duration === 'indefinite' ? 'pour une durée indéfinie' : input.duration === '1_week' ? 'pendant 1 semaine' : 'pendant 1 mois'}.</p>
         <p>Vous pouvez le réactiver à tout moment en vous reconnectant à l'application.</p>`,
      ),
    }).catch(() => null);
  },

  // ── Réactivation ─────────────────────────────────────────────────────────

  async reactivate(id: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new HttpError(404, 'Utilisateur introuvable');
    await prisma.user.update({ where: { id }, data: { status: 'active', deactivatedUntil: null } as any });
    await writeAudit(id, 'user.reactivated');
    sendEmail({
      to: [{ email: user.email, name: `${user.firstName} ${user.lastName}` }],
      subject: 'Compte réactivé — Primeo',
      htmlContent: emailHtml(
        'Compte réactivé avec succès',
        `<p>Bonjour <strong>${user.firstName}</strong>,</p>
         <p>Votre compte Primeo est maintenant actif. Bienvenue de retour !</p>`,
      ),
    }).catch(() => null);
  },

  // ── Suppression définitive ────────────────────────────────────────────────

  async deleteAccount(id: string, input: DeleteAccountInput) {
    const user = await prisma.user.findUnique({
      where: { id },
      include: { clientBookings: { where: { startDate: { gte: new Date() }, status: { notIn: ['cancelled_by_client', 'cancelled_by_professional', 'completed'] } } } },
    });
    if (!user) throw new HttpError(404, 'Utilisateur introuvable');

    // Valider le mot de passe via Supabase (les comptes Google sans mot de passe sont refusés ici)
    const { error: signInError } = await supabaseAuth.auth.signInWithPassword({
      email: user.email,
      password: input.password,
    });
    if (signInError) throw new HttpError(400, 'Mot de passe incorrect');

    // Bloquer si réservations futures en cours
    if (user.clientBookings.length > 0) {
      throw new HttpError(409, `Impossible de supprimer le compte : ${user.clientBookings.length} réservation(s) future(s) en cours. Annulez-les d'abord.`);
    }

    const email = user.email;
    const name = `${user.firstName} ${user.lastName}`;

    // Anonymisation RGPD : remplacer les données personnelles
    const deletedPrefix = `deleted_${id.slice(0, 8)}`;
    await prisma.user.update({
      where: { id },
      data: {
        email:       `${deletedPrefix}@deleted.primeo.ci`,
        phone:       `+2250000000000_${id.slice(0, 8)}`,
        firstName:   'Compte',
        lastName:    'Supprimé',
        avatarUrl:   null,
        birthDate:   null,
        gender:      null,
        status:      'banned',
        onesignalPlayerId: null,
      } as any,
    });

    // Purge explicite des tokens push : la ligne user étant anonymisée (et non
    // supprimée), le cascade FK ne se déclenche pas → nettoyage manuel.
    await prisma.pushToken.deleteMany({ where: { userId: id } }).catch(() => null);

    await writeAudit(id, 'user.account_deleted', { reason: input.reason });

    // Supprimer de Supabase Auth (fire-and-forget)
    supabaseAdmin.auth.admin.deleteUser(id).catch(() => null);

    // Email de confirmation à l'ancien email
    sendEmail({
      to: [{ email, name }],
      subject: 'Compte Primeo supprimé',
      htmlContent: emailHtml(
        'Compte supprimé',
        `<p>Bonjour,</p>
         <p>Votre compte Primeo a été supprimé définitivement. Vos données personnelles ont été effacées conformément à notre politique de confidentialité.</p>
         <p>Si vous avez des questions, écrivez-nous à <a href="mailto:support@primeo.ci">support@primeo.ci</a>.</p>`,
      ),
    }).catch(() => null);
  },

  // ── 2FA (TOTP) — secrets stockés dans Supabase user_metadata ──────────────

  async setup2fa(userId: string): Promise<{ secret: string; qrCode: string }> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new HttpError(404, 'Utilisateur introuvable');

    const secret = generateTotpSecret();
    // Stocker temporairement le secret (non encore confirmé) dans Supabase user_metadata
    await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: { twoFactorSecret: secret, twoFactorEnabled: false },
    });

    const uri = generateTotpUri(secret, user.email);
    const qrCode = await generateQrCode(uri);
    return { secret, qrCode };
  },

  async confirm2fa(userId: string, token: string): Promise<void> {
    const { data: { user: sbUser }, error } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (error || !sbUser) throw new HttpError(404, 'Utilisateur introuvable');

    const secret = sbUser.user_metadata?.twoFactorSecret as string | undefined;
    if (!secret) throw new HttpError(400, 'Configuration 2FA non initialisée. Appelez d\'abord /2fa/setup.');
    if (!verifyTotp(secret, token)) throw new HttpError(400, 'Code TOTP incorrect ou expiré');

    await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: { ...sbUser.user_metadata, twoFactorEnabled: true },
    });
  },

  async disable2fa(userId: string): Promise<void> {
    const { data: { user: sbUser }, error } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (error || !sbUser) throw new HttpError(404, 'Utilisateur introuvable');

    if (!sbUser.user_metadata?.twoFactorEnabled) throw new HttpError(400, 'Le 2FA n\'est pas activé sur ce compte');

    await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: { ...sbUser.user_metadata, twoFactorEnabled: false, twoFactorSecret: null },
    });
  },
};
