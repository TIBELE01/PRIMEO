// Client email — API transactionnelle Brevo v3 (HTTP) avec templates HTML locaux.
// N'utilise pas SMTP : la clé API (BREVO_API_KEY) suffit, aucun credential SMTP requis.
import axios from 'axios';
import { brevoConfig } from '../../config/brevo.config';
import { env } from '../../config/env.config';
import { logger } from './logger';
import { prisma } from '../../database/prisma.service';
import { renderLocalTemplate } from '../email/templates';
// Réexporté pour compatibilité : certains modules historiques importent
// renderLocalTemplate depuis le mailer plutôt que depuis common/email/templates.
export { renderLocalTemplate };
import {
  renderEmail,
  heading,
  greeting,
  paragraph,
  button,
  alertBox,
  codeBlock,
  muted,
  divider,
} from '../email/layout';

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
  const html = renderEmail({
    title: 'Réinitialisation de mot de passe',
    accent: 'primary',
    preheader: 'Réinitialisez votre mot de passe Primeo.',
    body:
      heading('🔑 Réinitialisation de mot de passe') +
      greeting(opts.firstName) +
      paragraph(
        'Nous avons reçu une demande de réinitialisation de mot de passe pour votre compte Primeo. Cliquez sur le bouton ci-dessous pour en créer un nouveau.',
      ) +
      button(opts.resetUrl, 'Réinitialiser mon mot de passe', 'primary') +
      muted(`⏱ Ce lien est valable <strong>${opts.expiresInMinutes} minutes</strong>. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email — votre mot de passe restera inchangé.`) +
      divider() +
      muted(`Le bouton ne fonctionne pas ? Copiez ce lien : <a href="${opts.resetUrl}" style="color:#0055FF;word-break:break-all;">${opts.resetUrl}</a>`),
  });

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
  amountPaid?: number;
  balanceDue?: number;
  guests?: number;
  reservationTime?: string;
  mode?: 'stay' | 'table';
  invoiceUrl?: string;
}): Promise<void> {
  // Les montants sont transmis en valeur numérique : le template les formate
  // (et masque les lignes nulles). On n'inclut payé/solde que s'ils sont > 0.
  const money = (n?: number) => (typeof n === 'number' && n > 0 ? n : undefined);
  await sendTemplateEmail(opts.to, brevoConfig.templates.bookingConfirmation, {
    firstName: opts.firstName,
    bookingId: opts.bookingId,
    propertyTitle: opts.propertyTitle,
    startDate: opts.startDate,
    endDate: opts.endDate,
    totalAmount: opts.totalAmount,
    ...(money(opts.amountPaid) !== undefined ? { amountPaid: opts.amountPaid } : {}),
    ...(money(opts.balanceDue) !== undefined ? { balanceDue: opts.balanceDue } : {}),
    ...(opts.guests ? { guests: opts.guests } : {}),
    ...(opts.reservationTime ? { reservationTime: opts.reservationTime } : {}),
    ...(opts.mode === 'table' ? { mode: 'table' } : {}),
    bookingUrl: `${env.FRONTEND_URL ?? 'https://primeo.ci'}/bookings/${opts.bookingId}`,
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

  const html = renderEmail({
    title: 'Invitation co-gérant Primeo',
    accent: 'primary',
    preheader: `${opts.inviterName} vous invite à co-gérer ${opts.businessName} sur Primeo.`,
    body:
      heading('🤝 Invitation à co-gérer un espace pro') +
      paragraph(
        `<strong>${opts.inviterName}</strong> vous invite à co-gérer l'espace <strong>${opts.businessName}</strong> sur Primeo.`,
      ) +
      alertBox(`<strong>Rôle assigné :</strong> ${roleDisplay}`, 'primary') +
      (!opts.invitedUserExists
        ? paragraph("Vous n'avez pas encore de compte Primeo. Créez-en un d'abord, puis acceptez l'invitation.") +
          button(registerUrl, 'Créer un compte', 'secondary')
        : '') +
      paragraph(
        opts.invitedUserExists
          ? "Connectez-vous à l'application Primeo et acceptez l'invitation avec le code ci-dessous :"
          : "Une fois connecté, acceptez l'invitation avec ce code dans l'application :",
      ) +
      codeBlock(opts.token) +
      muted('Cette invitation expire dans 7 jours.'),
  });

  await sendEmail({
    to: opts.to,
    subject: `${opts.inviterName} vous invite à co-gérer ${opts.businessName} sur Primeo`,
    htmlContent: html,
  });
}

// ─── Email de test (prévisualisation admin) ───────────────────────────────────

/**
 * Envoie un email de test pour un template donné, avec des données d'exemple
 * réalistes. Utilisé par l'endpoint admin de prévisualisation des templates.
 */
export async function sendTestEmail(opts: {
  to: EmailRecipient[];
  templateId: number;
  params?: Record<string, unknown>;
}): Promise<void> {
  const sample: Record<string, unknown> = {
    firstName: 'Awa',
    name: 'Awa Koné',
    clientName: 'Awa Koné',
    senderName: 'Awa Koné',
    refereeName: 'Moussa Diallo',
    propertyTitle: 'Villa Cocody Premium',
    startDate: '15 juillet 2026',
    endDate: '20 juillet 2026',
    reservationTime: '20h00',
    guests: '4',
    totalAmount: 250000,
    amountPaid: 25000,
    balanceDue: 225000,
    amount: 25000,
    rewardAmount: 1000,
    bookingId: 'a1b2c3d4e5f6',
    planName: 'Premium',
    nextBillingDate: '14 juillet 2026',
    reason: 'Document illisible — merci de renvoyer une photo nette.',
    rating: 5,
    comment: 'Séjour parfait, accueil chaleureux et logement impeccable !',
    replyText: 'Merci beaucoup pour votre retour, au plaisir de vous accueillir à nouveau !',
    duration: '7 jours',
    expiresAt: '21 juillet 2026 à 23h59',
    contactPhone: '+225 07 00 00 00 00',
    contactEmail: 'awa.kone@example.ci',
    messagePreview: 'Bonjour, le bien est-il toujours disponible ce week-end ?',
    otp: '482913',
    ...opts.params,
  };

  await sendTemplateEmail(opts.to, opts.templateId, sample);
}
