// Notifications orchestrator — selects channels by type and user preferences
import { prisma } from '../../database/prisma.service';
import { logger } from '../../common/utils/logger';
import { sendTemplateEmail } from '../../common/utils/mailer';
import { registerExpoTokenWithOneSignal } from '../../common/utils/push';
import { sendSms } from '../../common/utils/sms';
import { brevoConfig } from '../../config/brevo.config';
import { pushProvider } from './providers/push.provider';
import {
  NotificationType,
  NotifyParams,
  NotificationData,
  NotificationPreferences,
  DEFAULT_PREFERENCES,
  CHANNEL_CONFIG,
} from './notifications.types';

// ── Phone number normalisation (+225 for Côte d'Ivoire) ───────────────────────

function formatIvorianPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('225')) return `+${digits}`;
  if (digits.length === 10) return `+225${digits}`;
  if (digits.length === 8) return `+225${digits}`;  // legacy 8-digit
  return `+${digits}`;
}

// ── In-app content builders ───────────────────────────────────────────────────

function buildInAppContent(type: NotificationType, data: NotificationData): { title: string; body: string } {
  switch (type) {
    case 'booking_confirmed':
      return {
        title: 'Réservation confirmée',
        body: `Votre réservation à ${data['propertyTitle'] ?? 'votre hébergement'} (${data['startDate']} → ${data['endDate']}) est confirmée.`,
      };
    case 'booking_cancelled': {
      // Corps neutre : ce type est envoyé au client ET au professionnel
      const by =
        data['cancelledBy'] === 'client' ? ' par le client'
        : data['cancelledBy'] === 'professional' ? ' par le responsable'
        : '';
      return {
        title: 'Réservation annulée',
        body: `La réservation à ${data['propertyTitle'] ?? 'votre hébergement'}${data['startDate'] ? ` (${data['startDate']})` : ''} a été annulée${by}.`,
      };
    }
    case 'stay_reminder':
      return {
        title: '📅 Rappel — c\'est demain !',
        body: `Votre réservation à ${data['propertyTitle'] ?? 'votre hébergement'} commence demain${data['startDate'] ? ` (${data['startDate']})` : ''}. Bon séjour !`,
      };
    case 'new_booking':
      return {
        title: 'Nouvelle réservation',
        body: `${data['senderName'] ?? 'Un client'} a réservé ${data['propertyTitle'] ?? 'votre bien'} du ${data['startDate']} au ${data['endDate']}.`,
      };
    case 'property_interest':
      return {
        title: 'Nouvel intérêt pour votre bien',
        body: `${data['senderName'] ?? 'Un client'} a exprimé son intérêt pour « ${data['propertyTitle'] ?? 'votre bien'} ». Contact : ${data['contactPhone'] ?? data['contactEmail'] ?? 'voir l\'application'}.`,
      };
    case 'interest_booking_received':
      return {
        title: '🏠 Nouvelle demande d\'intérêt',
        body: `${data['senderName'] ?? 'Un client'} a exprimé son intérêt pour « ${data['propertyTitle'] ?? 'votre bien' } ». Ouvrez la messagerie pour lui répondre.`,
      };
    case 'interest_submitted':
      return {
        title: 'Intérêt enregistré',
        body: `Votre intérêt pour « ${data['propertyTitle'] ?? 'ce bien' } » a bien été transmis. Une discussion a été ouverte avec le responsable.`,
      };
    case 'payment_failed':
      return {
        title: 'Paiement échoué',
        body: `Le paiement pour ${data['planName'] ?? 'votre réservation'} a échoué. Vérifiez vos informations.`,
      };
    case 'payment_success':
      return {
        title: 'Paiement reçu',
        body: `Votre paiement de ${(data['totalAmount'] as number | undefined)?.toLocaleString('fr-CI') ?? '—'} FCFA a été reçu.`,
      };
    case 'new_message':
      return {
        title: `Message de ${data['senderName'] ?? 'un utilisateur'}`,
        body: (data['messagePreview'] as string | undefined) ?? 'Vous avez reçu un nouveau message.',
      };
    case 'review_received':
      return {
        title: 'Nouvel avis reçu',
        body: `${data['senderName'] ?? 'Un client'} a laissé un avis${data['rating'] ? ` (${String(data['rating'])}/5)` : ''} sur votre bien.`,
      };
    case 'review_published':
      return {
        title: 'Avis publié',
        body: `Votre avis sur ${data['propertyTitle'] ?? 'la propriété'} est maintenant visible.`,
      };
    case 'review_reply':
      return {
        title: 'Réponse à votre avis',
        body: `Le responsable de ${data['propertyTitle'] ?? 'la propriété'} a répondu à l'avis que vous avez laissé.`,
      };
    case 'dispute_opened':
      return {
        title: 'Litige ouvert',
        body: `Un litige a été ouvert pour la réservation ${data['bookingId'] ?? ''}. Un administrateur va vous contacter.`,
      };
    case 'dispute_resolved':
      return {
        title: 'Litige résolu',
        body: 'Le litige concernant votre réservation a été résolu.',
      };
    case 'kyc_approved':
      return {
        title: 'KYC approuvé',
        body: "Votre vérification d'identité a été approuvée. Vous pouvez maintenant publier des annonces.",
      };
    case 'kyc_rejected':
      return {
        title: 'KYC refusé',
        body: `Votre dossier KYC a été refusé${data['reason'] ? ` : ${String(data['reason'])}` : ''}. Vous pouvez soumettre à nouveau.`,
      };
    case 'subscription_renewal':
      return {
        title: 'Abonnement renouvelé',
        body: `Votre abonnement ${String(data['planName'] ?? '')} a été renouvelé avec succès.`,
      };
    case 'subscription_suspended':
      return {
        title: 'Abonnement suspendu',
        body: 'Votre abonnement a été suspendu après plusieurs échecs de paiement. Vos annonces sont masquées.',
      };
    case 'subscription_upgraded':
      return {
        title: `Formule ${String(data['newPlanName'] ?? '')} activée 🎉`,
        body: `Votre passage à la formule ${String(data['newPlanName'] ?? '')} est effectif. Tous vos nouveaux avantages sont disponibles.`,
      };
    case 'subscription_downgraded':
      return {
        title: 'Changement de formule programmé',
        body: `Votre passage à la formule ${String(data['newPlanName'] ?? '')} prendra effet le ${String(data['effectiveDate'] ?? '')}.${data['suspendedCount'] ? ` ${String(data['suspendedCount'])} annonce(s) seront désactivées.` : ''}`,
      };
    case 'subscription_reactivated':
      return {
        title: 'Abonnement réactivé',
        body: `Votre formule ${String(data['newPlanName'] ?? '')} a été réactivée avec succès. Vos annonces sont à nouveau en ligne.`,
      };
    case 'subscription_grace_warning':
      return {
        title: '⚠️ Abonnement en cours de suspension',
        body: `Il reste ${String(data['daysRemaining'] ?? 3)} jours avant la suspension de votre abonnement. Mettez à jour votre moyen de paiement pour éviter l'interruption de service.`,
      };
    case 'account_suspended':
      return {
        title: 'Compte suspendu',
        body: `Votre compte Primeo a été suspendu${data['reason'] ? ` : ${String(data['reason'])}` : ''}. Contactez le support pour plus d'informations.`,
      };
    case 'property_approved':
      return {
        title: 'Annonce approuvée',
        body: `Votre annonce "${String(data['propertyTitle'] ?? '')}" est maintenant en ligne.`,
      };
    case 'property_rejected':
      return {
        title: 'Annonce refusée',
        body: `Votre annonce "${String(data['propertyTitle'] ?? '')}" a été refusée${data['reason'] ? ` : ${String(data['reason'])}` : ''}.`,
      };
    case 'property_modifications_requested':
      return {
        title: 'Modifications demandées',
        body: `Des modifications sont requises pour votre annonce "${String(data['propertyTitle'] ?? '')}"${data['feedback'] ? ` : ${String(data['feedback'])}` : ''}.`,
      };
    case 'property_suspended':
      return {
        title: 'Annonce suspendue',
        body: `Votre annonce "${String(data['propertyTitle'] ?? '')}" a été suspendue${data['reason'] ? ` : ${String(data['reason'])}` : ''}.`,
      };
    case 'ticket_status_changed':
      return {
        title: 'Statut de ticket mis à jour',
        body: `Votre ticket "${String(data['subject'] ?? '')}" est maintenant : ${String(data['newStatus'] ?? '')}`,
      };
    case 'ticket_comment_added':
      return {
        title: 'Réponse à votre ticket',
        body: `L'équipe support a répondu à votre ticket "${String(data['subject'] ?? '')}".`,
      };
    case 'otp_code':
      return {
        title: 'Code de vérification',
        body: `Votre code Primeo : ${String(data['otpCode'] ?? '------')}.`,
      };
    case 'referral_reward':
      return {
        title: '🎉 Récompense de parrainage',
        body: `Votre filleul ${String(data['refereeName'] ?? '')} a effectué sa première réservation. ${(data['rewardAmount'] as number | undefined)?.toLocaleString('fr-CI') ?? '2 000'} FCFA ont été ajoutés à votre portefeuille.`,
      };
    case 'boost_expiry_reminder':
      return {
        title: '⚡ Votre boost expire demain',
        body: `Le boost de votre annonce "${String(data['propertyTitle'] ?? '')}" expire dans moins de 24h. Renouvelez-le pour maintenir votre visibilité.`,
      };
    case 'booking_dates_updated':
      return {
        title: 'Dates de réservation modifiées',
        body: `Les dates de la réservation pour « ${data['propertyTitle'] ?? 'votre bien'} » ont été modifiées : du ${String(data['newStartDate'] ?? data['startDate'] ?? '?')} au ${String(data['newEndDate'] ?? data['endDate'] ?? '?')}.`,
      };
    default:
      return { title: '', body: '' };
  }
}

// ── SMS message builders (critical types only) ────────────────────────────────

function buildSmsText(type: NotificationType, data: NotificationData): string {
  switch (type) {
    case 'otp_code':
      return `PRIMEO: Votre code de vérification est ${String(data['otpCode'])}. Valable 5 minutes. Ne le partagez pas.`;
    case 'payment_failed':
      return `PRIMEO: Echec de paiement pour votre abonnement ${String(data['planName'] ?? '')}. Mettez à jour vos informations sur l'app.`;
    case 'subscription_suspended':
      return `PRIMEO: Votre abonnement a été suspendu après 7 échecs de paiement. Reconnectez-vous pour régulariser.`;
    case 'subscription_grace_warning':
      return `PRIMEO: Votre abonnement sera suspendu dans ${String(data['daysRemaining'] ?? 3)} jours. Mettez à jour votre moyen de paiement dans l'app.`;
    case 'new_booking':
      return `PRIMEO: Nouvelle réservation pour ${String(data['propertyTitle'] ?? 'votre bien')} du ${String(data['startDate'])} au ${String(data['endDate'])}. Confirmez dans l'app.`;
    case 'interest_booking_received':
      return `PRIMEO: ${String(data['senderName'] ?? 'Un client')} est intéressé par "${String(data['propertyTitle'] ?? 'votre bien')}". Répondez-lui via la messagerie de l'app.`;
    default:
      return `PRIMEO: Notification importante sur votre compte. Ouvrez l'application pour les détails.`;
  }
}

// ── Brevo email dispatch ──────────────────────────────────────────────────────

async function dispatchEmail(
  type: NotificationType,
  email: string,
  firstName: string,
  data: NotificationData,
): Promise<void> {
  const t = brevoConfig.templates;

  const templateMap: Partial<Record<NotificationType, number>> = {
    booking_confirmed:      t.bookingConfirmation,
    booking_cancelled:      t.bookingCancellation,
    new_booking:            t.bookingConfirmationPro,
    property_interest:              t.interestPro,
    interest_booking_received:      t.interestPro,
    interest_submitted:             t.interestClient,
    payment_failed:         t.subscriptionRenewal,
    payment_success:        t.paymentReceipt,
    new_message:            t.newMessage,
    stay_reminder:          t.stayReminder,
    review_received:        t.reviewReceived,
    review_reply:           t.reviewReply,
    dispute_opened:         t.bookingCancellation,
    dispute_resolved:       t.bookingConfirmation,
    kyc_approved:           t.kycApproved,
    kyc_rejected:           t.kycRejected,
    subscription_renewal:       t.subscriptionRenewal,
    subscription_suspended:     t.subscriptionRenewal,
    subscription_upgraded:      t.subscriptionRenewal,
    subscription_downgraded:    t.subscriptionRenewal,
    subscription_reactivated:   t.subscriptionRenewal,
    subscription_grace_warning: t.subscriptionRenewal,
    referral_reward:        t.referralReward,
    boost_activated:        t.boostActivated,
    boost_expiry_reminder:  t.boostExpiryReminder,
  };

  const templateId = templateMap[type];
  if (!templateId) return;

  await sendTemplateEmail([{ email, name: firstName }], templateId, { firstName, ...data });
}

// ── Main orchestrator ─────────────────────────────────────────────────────────

export const notificationsService = {
  async notify({ type, recipientId, data }: NotifyParams): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: recipientId },
      select: {
        email: true,
        firstName: true,
        phone: true,
        notificationPreferences: true,
      },
    });
    if (!user) {
      logger.warn(`notify: user ${recipientId} not found`);
      return;
    }

    const rawPrefs = user.notificationPreferences as Partial<NotificationPreferences> | null;
    const prefs: NotificationPreferences = { ...DEFAULT_PREFERENCES, ...rawPrefs };
    const cfg = CHANNEL_CONFIG[type];
    const content = buildInAppContent(type, data);

    // Always persist in-app notification
    await prisma.notification.create({
      data: { userId: recipientId, type, title: content.title, body: content.body, data: data as never },
    }).catch((err) => logger.warn('Failed to persist notification', err));

    // Email — respect user prefs (unless critical type handled below)
    if (cfg.email && prefs.email) {
      dispatchEmail(type, user.email, user.firstName, data).catch((err) =>
        logger.warn(`Email [${type}] to ${user.email} failed`, err),
      );
    }

    // Push — via push_tokens table (multi-device, OneSignal + Expo fallback)
    if (cfg.push && prefs.push) {
      pushProvider
        .sendToUser(recipientId, type, content.title, content.body, data as Record<string, unknown>, cfg.pushPriority)
        .catch((err) => logger.warn(`Push [${type}] for ${recipientId} failed`, err));
    }

    // SMS — critical types bypass preferences; others respect prefs
    const sendViaSms = cfg.sms && (cfg.smsCritical || prefs.sms);
    if (sendViaSms && user.phone) {
      const formatted = formatIvorianPhone(user.phone);
      if (formatted) {
        const text = buildSmsText(type, data);
        sendSms(formatted, text, { isOtp: type === 'otp_code' }).catch((err) =>
          logger.warn(`SMS [${type}] to ${formatted} failed`, err),
        );
      }
    }
  },

  // ── In-app listing ───────────────────────────────────────────────────────────

  async listForUser(userId: string, page = 1, limit = 50) {
    const where = { userId };
    const [data, total, unread] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId, isRead: false } }),
    ]);
    return { data, total, unread, page, limit, pages: Math.ceil(total / limit) };
  },

  async markRead(id: string, userId: string): Promise<void> {
    await prisma.notification.updateMany({ where: { id, userId }, data: { isRead: true } });
  },

  async markAllRead(userId: string): Promise<void> {
    await prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
  },

  // ── Preferences ──────────────────────────────────────────────────────────────

  async getPreferences(userId: string): Promise<NotificationPreferences> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { notificationPreferences: true },
    });
    const raw = user?.notificationPreferences as Partial<NotificationPreferences> | null;
    return { ...DEFAULT_PREFERENCES, ...raw };
  },

  async updatePreferences(
    userId: string,
    prefs: Partial<NotificationPreferences>,
  ): Promise<NotificationPreferences> {
    const current = await notificationsService.getPreferences(userId);
    const merged: NotificationPreferences = { ...current, ...prefs };
    await prisma.user.update({
      where: { id: userId },
      data: { notificationPreferences: merged as never },
    });
    return merged;
  },

  // ── Push token ───────────────────────────────────────────────────────────────

  async registerPushToken(userId: string, token: string, platform?: string): Promise<void> {
    // Attempt OneSignal device registration to obtain a player_id
    const playerId = await registerExpoTokenWithOneSignal(token, userId, platform);

    // Upsert in push_tokens table (idempotent — same token from same device re-activates)
    await prisma.pushToken.upsert({
      where: { userId_token: { userId, token } },
      create: { userId, token, playerId, platform: platform ?? null, isActive: true },
      update: { playerId, platform: platform ?? null, isActive: true },
    });

    // Backward compat: keep first player_id on User record for any legacy code paths
    if (playerId) {
      await prisma.user.update({ where: { id: userId }, data: { onesignalPlayerId: playerId } });
    }

    logger.debug(`Push token registered for user ${userId} — platform=${platform ?? '?'} oneSignal=${playerId ? 'yes' : 'no'}`);
  },
};
