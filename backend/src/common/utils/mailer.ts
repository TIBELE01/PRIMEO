// Client email Brevo (transactionnel) — tous les emails sortants de la plateforme
import axios from 'axios';
import { brevoConfig } from '../../config/brevo.config';
import { env } from '../../config/env.config';
import { logger } from './logger';
import { prisma } from '../../database/prisma.service';

interface EmailRecipient {
  email: string;
  name?: string;
}

interface SendEmailOptions {
  to: EmailRecipient[];
  subject: string;
  htmlContent?: string;
  templateId?: number;
  params?: Record<string, unknown>;
}

// ─── Client bas niveau ────────────────────────────────────────────────────────

export async function sendEmail(options: SendEmailOptions): Promise<void> {
  if (!brevoConfig.apiKey) {
    logger.warn('Brevo API key non configurée — email ignoré');
    return;
  }

  const subject = options.subject || (options.templateId ? `template:${options.templateId}` : '(sans sujet)');

  for (const recipient of options.to) {
    // Vérifie si l'adresse a déjà bouncé — évite d'envoyer à une adresse invalide
    try {
      const user = await prisma.user.findUnique({
        where: { email: recipient.email },
        select: { emailBounced: true },
      });
      if (user?.emailBounced) {
        logger.warn(`Email ignoré — adresse marquée bounce : ${recipient.email}`);
        await prisma.emailLog.create({
          data: {
            recipient: recipient.email,
            subject,
            templateId: options.templateId ?? null,
            status: 'failed',
            errorMessage: 'Adresse marquée comme invalide (bounce précédent)',
          },
        });
        continue;
      }
    } catch {
      // Ne pas bloquer l'envoi si la vérification échoue (utilisateur non trouvé = email externe normal)
    }

    let logId: string | null = null;

    // Crée le log d'envoi avant l'appel API pour tracer même les timeouts
    try {
      const log = await prisma.emailLog.create({
        data: { recipient: recipient.email, subject, templateId: options.templateId ?? null, status: 'sent' },
      });
      logId = log.id;
    } catch (logErr) {
      logger.warn('emailLog : échec création pre-send', logErr);
    }

    try {
      const resp = await axios.post(
        `${brevoConfig.baseUrl}/smtp/email`,
        {
          sender: { email: brevoConfig.senderEmail, name: brevoConfig.senderName },
          to: [recipient],
          subject: options.subject,
          htmlContent: options.htmlContent,
          ...(options.templateId ? { templateId: options.templateId } : {}),
          ...(options.params ? { params: options.params } : {}),
        },
        {
          headers: {
            'api-key': brevoConfig.apiKey,
            'Content-Type': 'application/json',
          },
        }
      );

      // Brevo renvoie { messageId: "<...>" } — on le stocke pour corréler les webhooks
      const messageId = (resp.data as { messageId?: string })?.messageId ?? null;
      if (logId && messageId) {
        await prisma.emailLog.update({
          where: { id: logId },
          data: { messageId },
        }).catch((err) => logger.warn('emailLog : échec mise à jour messageId', err));
      }

      logger.debug(`Email envoyé à ${recipient.email}${messageId ? ` [${messageId}]` : ''}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.error(`Échec envoi email à ${recipient.email}`, err);

      if (logId) {
        await prisma.emailLog.update({
          where: { id: logId },
          data: { status: 'failed', errorMessage },
        }).catch((updateErr) => logger.warn('emailLog : échec mise à jour status failed', updateErr));
      }

      // Remonte l'erreur pour que l'appelant puisse gérer le cas d'échec
      throw err;
    }
  }
}

export async function sendTemplateEmail(
  to: EmailRecipient[],
  templateId: number,
  params: Record<string, unknown>
): Promise<void> {
  return sendEmail({ to, templateId, params, subject: '' });
}

// ─── Emails métier ────────────────────────────────────────────────────────────

export async function sendPasswordResetEmail(opts: {
  to: EmailRecipient[];
  firstName: string;
  resetUrl: string;
  expiresInMinutes: number;
}): Promise<void> {
  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Réinitialisation de mot de passe</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background-color:#1E3A5F;padding:32px 40px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:28px;font-weight:700;letter-spacing:1px;">PRIMEO</h1>
              <p style="color:#B0C4DE;margin:4px 0 0;font-size:13px;">La plateforme immobilière ivoirienne</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="font-size:16px;color:#333;margin:0 0 16px;">Bonjour <strong>${opts.firstName}</strong>,</p>
              <p style="font-size:15px;color:#555;margin:0 0 24px;line-height:1.6;">
                Nous avons reçu une demande de réinitialisation de mot de passe pour votre compte Primeo.
                Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:24px 0;">
                    <a href="${opts.resetUrl}"
                       style="background-color:#F97316;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:6px;font-size:16px;font-weight:600;display:inline-block;">
                      Réinitialiser mon mot de passe
                    </a>
                  </td>
                </tr>
              </table>
              <p style="font-size:13px;color:#888;margin:0 0 8px;">
                ⏱ Ce lien est valable <strong>${opts.expiresInMinutes} minutes</strong>.
              </p>
              <p style="font-size:13px;color:#888;margin:0 0 24px;">
                Si vous n'avez pas demandé cette réinitialisation, ignorez cet email. Votre mot de passe reste inchangé.
              </p>
              <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
              <p style="font-size:12px;color:#aaa;margin:0;">
                Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>
                <a href="${opts.resetUrl}" style="color:#1E3A5F;word-break:break-all;">${opts.resetUrl}</a>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#f9f9f9;padding:24px 40px;text-align:center;border-top:1px solid #eee;">
              <p style="font-size:12px;color:#aaa;margin:0;">
                © ${new Date().getFullYear()} Primeo CI — Abidjan, Côte d'Ivoire<br>
                <a href="https://primeo.ci/legal/privacy" style="color:#aaa;">Politique de confidentialité</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  await sendEmail({
    to: opts.to,
    subject: 'Réinitialisation de votre mot de passe Primeo',
    htmlContent: html,
  });
}

export async function sendWelcomeEmail(opts: {
  to: EmailRecipient[];
  firstName: string;
  isClient: boolean;
}): Promise<void> {
  const templateId = opts.isClient
    ? brevoConfig.templates.welcomeClient
    : brevoConfig.templates.welcomeProfessional;

  await sendTemplateEmail(opts.to, templateId, {
    firstName: opts.firstName,
    appUrl: 'https://primeo.ci',
  });
}

export async function sendBookingConfirmationEmail(opts: {
  to: EmailRecipient[];
  firstName: string;
  bookingId: string;
  propertyTitle: string;
  startDate: string;
  endDate: string;
  totalAmount: number;
  invoiceUrl?: string;
}): Promise<void> {
  await sendTemplateEmail(opts.to, brevoConfig.templates.bookingConfirmation, {
    firstName: opts.firstName,
    bookingId: opts.bookingId,
    propertyTitle: opts.propertyTitle,
    startDate: opts.startDate,
    endDate: opts.endDate,
    totalAmount: opts.totalAmount.toLocaleString('fr-CI') + ' FCFA',
    bookingUrl: `https://primeo.ci/bookings/${opts.bookingId}`,
    invoiceUrl: opts.invoiceUrl ?? '',
  });
}

export async function sendCollaboratorInviteEmail(opts: {
  to: EmailRecipient[];
  inviterName: string;
  businessName: string;
  role: string;
  token: string;
  invitedUserExists: boolean;
}): Promise<void> {
  const roleLabels: Record<string, string> = {
    admin: 'Administrateur (tous les droits)',
    editor: 'Éditeur (modifier les annonces et gérer les réservations)',
    reader: 'Lecteur (consultation uniquement)',
  };
  const roleDisplay = roleLabels[opts.role] ?? opts.role;
  const registerUrl = `${env.FRONTEND_URL ?? 'https://primeo.ci'}/register`;

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitation co-gérant Primeo</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <tr>
            <td style="background-color:#1B5E20;padding:32px 40px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:28px;font-weight:700;letter-spacing:1px;">PRIMEO</h1>
              <p style="color:#A5D6A7;margin:4px 0 0;font-size:13px;">La plateforme immobilière ivoirienne</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <h2 style="color:#1B5E20;margin:0 0 16px;font-size:22px;">Vous avez été invité à rejoindre un espace professionnel</h2>
              <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px;">
                <strong>${opts.inviterName}</strong> vous invite à co-gérer l'espace <strong>${opts.businessName}</strong> sur Primeo.
              </p>
              <div style="background:#F0FDF4;border-left:4px solid #1B5E20;padding:16px;border-radius:4px;margin:0 0 24px;">
                <p style="margin:0;color:#374151;font-size:14px;"><strong>Rôle assigné :</strong> ${roleDisplay}</p>
              </div>
              ${!opts.invitedUserExists ? `
              <p style="color:#6B7280;font-size:14px;margin:0 0 16px;">
                Vous n'avez pas encore de compte Primeo. Créez-en un d'abord, puis acceptez l'invitation.
              </p>
              <table cellpadding="0" cellspacing="0" style="margin:0 0 16px;">
                <tr>
                  <td style="background-color:#6B7280;border-radius:6px;padding:14px 28px;">
                    <a href="${registerUrl}" style="color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;">Créer un compte</a>
                  </td>
                </tr>
              </table>
              ` : ''}
              <p style="color:#374151;font-size:14px;margin:0 0 16px;">
                ${opts.invitedUserExists ? 'Connectez-vous à l\'application Primeo et acceptez l\'invitation avec le code ci-dessous :' : 'Une fois connecté, acceptez l\'invitation avec ce code dans l\'application :'}
              </p>
              <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:6px;padding:16px;text-align:center;margin:0 0 24px;">
                <p style="margin:0;font-size:12px;color:#6B7280;margin-bottom:8px;">Code d'invitation</p>
                <code style="font-size:13px;color:#1B5E20;word-break:break-all;">${opts.token}</code>
              </div>
              <p style="color:#9CA3AF;font-size:12px;margin:0;">Cette invitation expire dans 7 jours.</p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#F9FAFB;padding:20px 40px;text-align:center;">
              <p style="color:#9CA3AF;font-size:12px;margin:0;">© ${new Date().getFullYear()} Primeo. Côte d'Ivoire.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  await sendEmail({
    to: opts.to,
    subject: `${opts.inviterName} vous invite à co-gérer ${opts.businessName} sur Primeo`,
    htmlContent: html,
  });
}
