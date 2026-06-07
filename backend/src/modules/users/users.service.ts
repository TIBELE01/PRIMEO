// Users service — gestion complète du profil, désactivation, suppression
import { prisma } from '../../database/prisma.service';
import { HttpError } from '../../common/handlers/http-error.handler';
import { hashPassword, comparePassword } from '../../common/utils/bcrypt';
import { generateTotpSecret, generateTotpUri, generateQrCode, verifyTotp } from '../../common/utils/totp';
import { sendEmail } from '../../common/utils/mailer';
import { logger } from '../../common/utils/logger';
import { UpdateProfileInput, ChangePasswordInput, DeactivateInput, DeleteAccountInput } from './dto/users.dto';
import { supabaseAdmin } from '../../config/supabase.config';

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
    const { passwordHash, twoFactorSecret, resetToken, otpCode, ...safe } = user;
    return safe;
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
    if (input.avatarUrl !== undefined)  userFields.avatarUrl = input.avatarUrl;

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

    const { passwordHash, twoFactorSecret, resetToken, otpCode, ...safe } = await prisma.user.findUnique({
      where: { id },
      include: { professionalProfile: { include: { documents: true } } },
    }) as any;
    return safe;
  },

  // ── Changement de mot de passe ────────────────────────────────────────────

  async changePassword(id: string, input: ChangePasswordInput) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new HttpError(404, 'Utilisateur introuvable');
    const valid = await comparePassword(input.currentPassword, user.passwordHash);
    if (!valid) throw new HttpError(400, 'Mot de passe actuel incorrect');
    const passwordHash = await hashPassword(input.newPassword);
    await prisma.user.update({ where: { id }, data: { passwordHash } });
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

    // Vérifier le mot de passe
    const valid = await comparePassword(input.password, user.passwordHash);
    if (!valid) throw new HttpError(400, 'Mot de passe incorrect');

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
        passwordHash:'[DELETED]',
        avatarUrl:   null,
        birthDate:   null,
        gender:      null,
        status:      'banned',
        onesignalPlayerId: null,
        otpCode:     null,
        resetToken:  null,
      } as any,
    });

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

  // ── 2FA (TOTP) ─────────────────────────────────────────────────────────────

  async setup2fa(userId: string): Promise<{ secret: string; qrCode: string }> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new HttpError(404, 'Utilisateur introuvable');
    const secret = generateTotpSecret();
    await prisma.user.update({ where: { id: userId }, data: { twoFactorSecret: secret } });
    const uri = generateTotpUri(secret, user.email);
    const qrCode = await generateQrCode(uri);
    return { secret, qrCode };
  },

  async confirm2fa(userId: string, token: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.twoFactorSecret) throw new HttpError(400, 'Configuration 2FA non initialisée. Appelez d\'abord /2fa/setup.');
    if (!verifyTotp(user.twoFactorSecret, token)) throw new HttpError(400, 'Code TOTP incorrect ou expiré');
    await prisma.user.update({ where: { id: userId }, data: { twoFactorEnabled: true } });
  },

  async disable2fa(userId: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new HttpError(404, 'Utilisateur introuvable');
    if (!user.twoFactorEnabled) throw new HttpError(400, 'Le 2FA n\'est pas activé sur ce compte');
    await prisma.user.update({ where: { id: userId }, data: { twoFactorEnabled: false, twoFactorSecret: null } });
  },
};
