// Client email — API transactionnelle Brevo v3 (HTTP) avec templates HTML locaux.
// N'utilise pas SMTP : la clé API (BREVO_API_KEY) suffit, aucun credential SMTP requis.
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

// ─── Helpers HTML ─────────────────────────────────────────────────────────────

function wrapHtml(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:40px 0;">
  <tr><td align="center">
  <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <tr><td style="background-color:#1E3A5F;padding:32px 40px;text-align:center;">
      <h1 style="color:#ffffff;margin:0;font-size:28px;font-weight:700;letter-spacing:1px;">PRIMEO</h1>
      <p style="color:#B0C4DE;margin:4px 0 0;font-size:13px;">La plateforme immobilière ivoirienne</p>
    </td></tr>
    <tr><td style="padding:40px;">${body}</td></tr>
    <tr><td style="background-color:#f9f9f9;padding:24px 40px;text-align:center;border-top:1px solid #eee;">
      <p style="font-size:12px;color:#aaa;margin:0;">
        © ${new Date().getFullYear()} Primeo CI — Abidjan, Côte d'Ivoire<br>
        <a href="https://primeo.ci/legal/privacy" style="color:#aaa;">Politique de confidentialité</a>
      </p>
    </td></tr>
  </table>
  </td></tr>
</table>
</body>
</html>`;
}

function btn(url: string, label: string, color = '#1E3A5F'): string {
  return `<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 0;">
    <a href="${url}" style="background-color:${color};color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:6px;font-size:16px;font-weight:600;display:inline-block;">${label}</a>
  </td></tr></table>`;
}

// ─── Templates HTML locaux ────────────────────────────────────────────────────

function renderLocalTemplate(templateId: number, params: Record<string, unknown>): { subject: string; html: string } {
  const p = (key: string, fallback = '') => String(params[key] ?? fallback);

  switch (templateId) {
    case 1: { // welcomeClient
      return {
        subject: 'Bienvenue sur Primeo !',
        html: wrapHtml('Bienvenue sur Primeo',
          `<p style="font-size:16px;color:#333;margin:0 0 16px;">Bonjour <strong>${p('firstName')}</strong>,</p>
          <p style="font-size:15px;color:#555;line-height:1.6;margin:0 0 24px;">
            Bienvenue sur <strong>Primeo</strong>, la plateforme immobilière ivoirienne de référence.<br>
            Votre compte est actif — découvrez des milliers d'annonces et réservez en toute sécurité.
          </p>
          ${btn(p('appUrl', 'https://primeo.ci'), 'Découvrir Primeo', '#F97316')}
          <p style="font-size:13px;color:#888;">L'équipe Primeo</p>`),
      };
    }

    case 2: { // welcomeProfessional
      return {
        subject: 'Bienvenue sur Primeo — Espace professionnel activé',
        html: wrapHtml('Bienvenue sur Primeo',
          `<p style="font-size:16px;color:#333;margin:0 0 16px;">Bonjour <strong>${p('firstName')}</strong>,</p>
          <p style="font-size:15px;color:#555;line-height:1.6;margin:0 0 24px;">
            Votre espace professionnel Primeo est activé. Publiez vos annonces et gérez vos réservations depuis votre tableau de bord.
          </p>
          ${btn(p('appUrl', 'https://primeo.ci'), 'Accéder à mon espace pro', '#F97316')}
          <p style="font-size:13px;color:#888;">L'équipe Primeo</p>`),
      };
    }

    case 3: { // bookingConfirmation
      const refId = p('bookingId').slice(0, 8).toUpperCase();
      return {
        subject: `Réservation confirmée — ${p('propertyTitle')}`,
        html: wrapHtml('Réservation confirmée',
          `<h2 style="color:#16A34A;margin:0 0 16px;">Votre réservation est confirmée ✓</h2>
          <p style="font-size:16px;color:#333;margin:0 0 16px;">Bonjour <strong>${p('firstName')}</strong>,</p>
          <table width="100%" cellpadding="12" style="background:#F0F4F8;border-radius:6px;margin:0 0 24px;font-size:14px;color:#374151;">
            <tr><td><strong>Bien</strong></td><td>${p('propertyTitle')}</td></tr>
            <tr><td><strong>Du</strong></td><td>${p('startDate')}</td></tr>
            <tr><td><strong>Au</strong></td><td>${p('endDate')}</td></tr>
            <tr><td><strong>Montant</strong></td><td><strong>${p('totalAmount')}</strong></td></tr>
            ${refId ? `<tr><td><strong>Référence</strong></td><td>${refId}</td></tr>` : ''}
          </table>
          ${p('bookingUrl') ? btn(p('bookingUrl'), 'Voir ma réservation') : ''}
          ${p('invoiceUrl') ? `<p style="font-size:13px;color:#555;"><a href="${p('invoiceUrl')}" style="color:#1E3A5F;">Télécharger ma facture</a></p>` : ''}
          <p style="font-size:13px;color:#888;">L'équipe Primeo</p>`),
      };
    }

    case 4: { // bookingCancellation
      return {
        subject: `Réservation annulée — ${p('propertyTitle')}`,
        html: wrapHtml('Réservation annulée',
          `<h2 style="color:#DC2626;margin:0 0 16px;">Votre réservation a été annulée</h2>
          <p style="font-size:16px;color:#333;margin:0 0 16px;">Bonjour <strong>${p('firstName')}</strong>,</p>
          <p style="font-size:15px;color:#555;line-height:1.6;margin:0 0 16px;">
            Votre réservation pour <strong>${p('propertyTitle')}</strong> prévue le <strong>${p('startDate')}</strong> a été annulée.
          </p>
          ${p('reason') ? `<div style="background:#FEF2F2;border-left:4px solid #DC2626;padding:12px 16px;border-radius:4px;margin:0 0 24px;font-size:14px;color:#374151;"><strong>Motif :</strong> ${p('reason')}</div>` : ''}
          ${btn('https://primeo.ci', 'Trouver un autre bien', '#6B7280')}
          <p style="font-size:13px;color:#888;">L'équipe Primeo</p>`),
      };
    }

    case 5: { // paymentReceipt
      const name = p('name') || p('firstName');
      return {
        subject: `Reçu de paiement Primeo`,
        html: wrapHtml('Reçu de paiement',
          `<h2 style="color:#1E3A5F;margin:0 0 16px;">Votre reçu de paiement</h2>
          <p style="font-size:16px;color:#333;margin:0 0 16px;">Bonjour <strong>${name}</strong>,</p>
          <table width="100%" cellpadding="12" style="background:#F0F4F8;border-radius:6px;margin:0 0 24px;font-size:14px;color:#374151;">
            ${p('bookingId') ? `<tr><td><strong>Référence</strong></td><td>${p('bookingId').slice(0, 8).toUpperCase()}</td></tr>` : ''}
            ${p('propertyTitle') ? `<tr><td><strong>Bien</strong></td><td>${p('propertyTitle')}</td></tr>` : ''}
            ${p('amount') ? `<tr><td><strong>Montant payé</strong></td><td><strong>${p('amount')}</strong></td></tr>` : ''}
            ${p('totalAmount') ? `<tr><td><strong>Montant</strong></td><td><strong>${p('totalAmount')}</strong></td></tr>` : ''}
          </table>
          ${p('invoiceUrl') ? `<p><a href="${p('invoiceUrl')}" style="color:#1E3A5F;font-weight:600;">Télécharger la facture PDF</a></p>` : ''}
          <p style="font-size:13px;color:#888;">L'équipe Primeo</p>`),
      };
    }

    case 6: { // kycApproved
      return {
        subject: 'Votre identité est vérifiée — Compte professionnel validé',
        html: wrapHtml('KYC approuvé',
          `<h2 style="color:#16A34A;margin:0 0 16px;">Votre identité est vérifiée ✓</h2>
          <p style="font-size:16px;color:#333;margin:0 0 16px;">Bonjour <strong>${p('name')}</strong>,</p>
          <p style="font-size:15px;color:#555;line-height:1.6;margin:0 0 24px;">
            Votre vérification d'identité (KYC) a été approuvée. Votre compte professionnel est pleinement actif — vous pouvez publier des annonces et recevoir des paiements.
          </p>
          ${btn('https://primeo.ci', 'Accéder à mon espace pro', '#16A34A')}
          <p style="font-size:13px;color:#888;">L'équipe Primeo</p>`),
      };
    }

    case 7: { // kycRejected
      return {
        subject: "Vérification d'identité — Action requise",
        html: wrapHtml('KYC rejeté',
          `<h2 style="color:#DC2626;margin:0 0 16px;">Vérification d'identité refusée</h2>
          <p style="font-size:16px;color:#333;margin:0 0 16px;">Bonjour <strong>${p('name')}</strong>,</p>
          <p style="font-size:15px;color:#555;line-height:1.6;margin:0 0 16px;">
            Votre vérification d'identité n'a pas pu être approuvée.
          </p>
          ${p('reason') ? `<div style="background:#FEF2F2;border-left:4px solid #DC2626;padding:12px 16px;border-radius:4px;margin:0 0 24px;font-size:14px;color:#374151;"><strong>Motif :</strong> ${p('reason')}</div>` : ''}
          <p style="font-size:14px;color:#555;margin:0 0 24px;">Soumettez vos documents à nouveau depuis l'application.</p>
          ${btn('https://primeo.ci', 'Renvoyer mes documents', '#F97316')}
          <p style="font-size:13px;color:#888;">L'équipe Primeo</p>`),
      };
    }

    case 8: { // subscriptionRenewal
      return {
        subject: `Abonnement ${p('planName')} renouvelé`,
        html: wrapHtml('Abonnement renouvelé',
          `<h2 style="color:#1E3A5F;margin:0 0 16px;">Votre abonnement a été renouvelé</h2>
          <p style="font-size:16px;color:#333;margin:0 0 16px;">Bonjour <strong>${p('firstName')}</strong>,</p>
          <table width="100%" cellpadding="12" style="background:#F0F4F8;border-radius:6px;margin:0 0 24px;font-size:14px;color:#374151;">
            <tr><td><strong>Formule</strong></td><td>${p('planName')}</td></tr>
            <tr><td><strong>Montant prélevé</strong></td><td><strong>${p('amount')}</strong></td></tr>
            <tr><td><strong>Prochain renouvellement</strong></td><td>${p('nextBillingDate')}</td></tr>
          </table>
          ${p('invoiceUrl') ? `<p><a href="${p('invoiceUrl')}" style="color:#1E3A5F;font-weight:600;">Télécharger la facture</a></p>` : ''}
          ${btn('https://primeo.ci', 'Gérer mon abonnement')}
          <p style="font-size:13px;color:#888;">L'équipe Primeo</p>`),
      };
    }

    case 9: { // otpCode
      return {
        subject: 'Votre code de vérification Primeo',
        html: wrapHtml('Code de vérification',
          `<p style="font-size:16px;color:#333;margin:0 0 16px;">Votre code de vérification Primeo est :</p>
          <div style="text-align:center;padding:24px 0;">
            <span style="font-size:36px;font-weight:700;letter-spacing:8px;color:#1E3A5F;">${p('otp')}</span>
          </div>
          <p style="font-size:13px;color:#888;margin:0;">Ce code est valable 5 minutes. Ne le communiquez à personne.</p>`),
      };
    }

    case 11: { // referralReward
      const name = p('firstName') || p('name');
      return {
        subject: 'Félicitations — Récompense de parrainage reçue !',
        html: wrapHtml('Récompense parrainage',
          `<h2 style="color:#F97316;margin:0 0 16px;">Vous avez reçu une récompense de parrainage !</h2>
          <p style="font-size:16px;color:#333;margin:0 0 16px;">Bonjour <strong>${name}</strong>,</p>
          <p style="font-size:15px;color:#555;line-height:1.6;margin:0 0 24px;">
            Votre parrainage a abouti. Votre récompense de <strong>${p('reward') || p('amount')}</strong> a été créditée sur votre compte.
          </p>
          ${btn('https://primeo.ci', 'Voir mon solde')}
          <p style="font-size:13px;color:#888;">L'équipe Primeo</p>`),
      };
    }

    default: {
      return {
        subject: `Notification Primeo`,
        html: wrapHtml('Notification Primeo',
          `<p style="font-size:15px;color:#555;line-height:1.8;">
            ${Object.entries(params).map(([k, v]) => `<strong>${k}</strong> : ${String(v)}`).join('<br>')}
          </p>`),
      };
    }
  }
}

// ─── Envoi via l'API transactionnelle Brevo v3 ────────────────────────────────

async function sendViaBrevoApi(
  to: EmailRecipient[],
  subject: string,
  htmlContent: string,
): Promise<void> {
  const apiKey = brevoConfig.apiKey;
  if (!apiKey) {
    logger.warn('BREVO_API_KEY absent — email ignoré');
    return;
  }

  await axios.post(
    `${brevoConfig.baseUrl}/smtp/email`,
    {
      sender: { email: brevoConfig.senderEmail, name: brevoConfig.senderName },
      to: to.map(r => ({ email: r.email, name: r.name ?? r.email })),
      subject,
      htmlContent,
    },
    {
      headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
      timeout: 10_000,
    },
  );
}

// ─── Client bas niveau ────────────────────────────────────────────────────────

export async function sendEmail(options: SendEmailOptions): Promise<void> {
  if (!brevoConfig.apiKey) {
    logger.warn('BREVO_API_KEY absent — email ignoré');
    return;
  }

  let htmlContent = options.htmlContent ?? '';
  let subject = options.subject;

  if (options.templateId) {
    const rendered = renderLocalTemplate(options.templateId, options.params ?? {});
    htmlContent = rendered.html;
    if (!subject) subject = rendered.subject;
  }

  const finalSubject = subject || 'Notification Primeo';

  for (const recipient of options.to) {
    // Vérifie si l'adresse a déjà bouncé
    try {
      const user = await prisma.user.findUnique({
        where: { email: recipient.email },
        select: { emailBounced: true },
      });
      if (user?.emailBounced) {
        logger.warn(`Email ignoré — bounce : ${recipient.email}`);
        await prisma.emailLog.create({
          data: {
            recipient: recipient.email,
            subject: finalSubject,
            templateId: options.templateId ?? null,
            status: 'failed',
            errorMessage: 'Adresse marquée comme invalide (bounce précédent)',
          },
        });
        continue;
      }
    } catch {
      // Utilisateur externe ou non trouvé — continuer
    }

    let logId: string | null = null;
    try {
      const log = await prisma.emailLog.create({
        data: { recipient: recipient.email, subject: finalSubject, templateId: options.templateId ?? null, status: 'sent' },
      });
      logId = log.id;
    } catch (logErr) {
      logger.warn('emailLog : échec création pre-send', logErr);
    }

    try {
      await sendViaBrevoApi([recipient], finalSubject, htmlContent);
      logger.debug(`Email Brevo envoyé à ${recipient.email}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.error(`Échec envoi email Brevo à ${recipient.email}`, err);

      if (logId) {
        await prisma.emailLog.update({
          where: { id: logId },
          data: { status: 'failed', errorMessage },
        }).catch((updateErr) => logger.warn('emailLog : échec mise à jour status failed', updateErr));
      }

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

// ─── Validation au démarrage ──────────────────────────────────────────────────

export async function validateSmtpConnection(): Promise<void> {
  if (!brevoConfig.apiKey) {
    logger.warn('Brevo : BREVO_API_KEY absent — envois email désactivés');
    return;
  }
  try {
    await axios.get(`${brevoConfig.baseUrl}/account`, {
      headers: { 'api-key': brevoConfig.apiKey },
      timeout: 5_000,
    });
    logger.info('Brevo API : connexion vérifiée ✓');
  } catch (err) {
    logger.error('Brevo API : échec de connexion au démarrage', err);
  }
}

// ─── Emails métier ────────────────────────────────────────────────────────────

export async function sendPasswordResetEmail(opts: {
  to: EmailRecipient[];
  firstName: string;
  resetUrl: string;
  expiresInMinutes: number;
}): Promise<void> {
  const html = wrapHtml('Réinitialisation de mot de passe',
    `<p style="font-size:16px;color:#333;margin:0 0 16px;">Bonjour <strong>${opts.firstName}</strong>,</p>
    <p style="font-size:15px;color:#555;margin:0 0 24px;line-height:1.6;">
      Nous avons reçu une demande de réinitialisation de mot de passe pour votre compte Primeo.
      Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe.
    </p>
    ${btn(opts.resetUrl, 'Réinitialiser mon mot de passe', '#F97316')}
    <p style="font-size:13px;color:#888;margin:0 0 8px;">
      ⏱ Ce lien est valable <strong>${opts.expiresInMinutes} minutes</strong>.
    </p>
    <p style="font-size:13px;color:#888;margin:0 0 24px;">
      Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
    </p>
    <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
    <p style="font-size:12px;color:#aaa;margin:0;">
      Lien direct : <a href="${opts.resetUrl}" style="color:#1E3A5F;word-break:break-all;">${opts.resetUrl}</a>
    </p>`);

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

  const html = wrapHtml('Invitation co-gérant Primeo',
    `<h2 style="color:#1B5E20;margin:0 0 16px;font-size:22px;">Vous avez été invité à rejoindre un espace professionnel</h2>
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
    ${btn(registerUrl, 'Créer un compte', '#6B7280')}
    ` : ''}
    <p style="color:#374151;font-size:14px;margin:0 0 16px;">
      ${opts.invitedUserExists ? "Connectez-vous à l'application Primeo et acceptez l'invitation avec le code ci-dessous :" : "Une fois connecté, acceptez l'invitation avec ce code dans l'application :"}
    </p>
    <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:6px;padding:16px;text-align:center;margin:0 0 24px;">
      <p style="margin:0;font-size:12px;color:#6B7280;margin-bottom:8px;">Code d'invitation</p>
      <code style="font-size:13px;color:#1B5E20;word-break:break-all;">${opts.token}</code>
    </div>
    <p style="color:#9CA3AF;font-size:12px;margin:0;">Cette invitation expire dans 7 jours.</p>`);

  await sendEmail({
    to: opts.to,
    subject: `${opts.inviterName} vous invite à co-gérer ${opts.businessName} sur Primeo`,
    htmlContent: html,
  });
}
