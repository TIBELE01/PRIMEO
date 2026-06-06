// Orange SMS API client — envoi de SMS + logs de livraison
import axios from 'axios';
import { orangeSmsConfig } from '../../config/orange-sms.config';
import { env } from '../../config/env.config';
import { logger } from './logger';
import { prisma } from '../../database/prisma.service';

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getOrangeToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.value;
  }

  const credentials = Buffer.from(
    `${orangeSmsConfig.clientId}:${orangeSmsConfig.clientSecret}`
  ).toString('base64');

  const response = await axios.post(
    orangeSmsConfig.tokenUrl,
    'grant_type=client_credentials',
    { headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
  );

  cachedToken = {
    value: response.data.access_token,
    expiresAt: Date.now() + (response.data.expires_in - 60) * 1000,
  };
  return cachedToken.value;
}

/**
 * Extrait le requestId depuis la resourceURL Orange.
 * Exemple : ".../outbound/tel%3A%2BPRIMEO/requests/abc123" → "abc123"
 */
function extractRequestId(resourceUrl: string | undefined): string | null {
  if (!resourceUrl) return null;
  const parts = resourceUrl.split('/');
  return parts[parts.length - 1] || null;
}

export interface SendSmsOptions {
  /** Si true, le log sera marqué isOtp=true pour déclencher le fallback email en cas d'échec */
  isOtp?: boolean;
}

/**
 * Envoie un SMS via Orange API et crée un enregistrement dans sms_logs.
 * La livraison est tracée de manière asynchrone via le webhook /api/webhooks/orange-sms.
 */
export async function sendSms(
  phoneNumber: string,
  message: string,
  options: SendSmsOptions = {},
): Promise<string | null> {
  if (!orangeSmsConfig.clientId || !orangeSmsConfig.clientSecret) {
    logger.warn('Orange SMS credentials not configured — SMS skipped');
    return null;
  }

  // Crée le log en statut "pending" avant l'appel API
  let logId: string | null = null;
  try {
    const log = await prisma.smsLog.create({
      data: {
        recipient: phoneNumber,
        message,
        status: 'pending',
        isOtp: options.isOtp ?? false,
      },
    });
    logId = log.id;
  } catch (err) {
    logger.warn('smsLog : échec création pre-send', err);
  }

  try {
    const token = await getOrangeToken();
    const senderAddress = encodeURIComponent(`tel:+${orangeSmsConfig.sender}`);

    // URL de callback pour les delivery reports Orange (optionnel — si BACKEND_URL configurée)
    const notifyURL = env.BACKEND_URL
      ? `${env.BACKEND_URL}/api/webhooks/orange-sms`
      : undefined;

    // callbackData = logId — permet de retrouver le log au retour du webhook
    const callbackData = logId ?? undefined;

    const response = await axios.post(
      `${orangeSmsConfig.smsUrl}/${senderAddress}/requests`,
      {
        outboundSMSMessageRequest: {
          address: [`tel:${phoneNumber}`],
          senderAddress: `tel:+${orangeSmsConfig.sender}`,
          outboundSMSTextMessage: { message },
          ...(notifyURL ? { notifyURL, callbackData } : {}),
        },
      },
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );

    // Orange retourne la resourceURL contenant le requestId
    const resourceUrl: string | undefined =
      response.data?.outboundSMSMessageRequest?.resourceURL;
    const requestId = extractRequestId(resourceUrl);

    if (logId) {
      await prisma.smsLog.update({
        where: { id: logId },
        data: { status: 'sent', requestId },
      }).catch((err) => logger.warn('smsLog : échec mise à jour status sent', err));
    }

    logger.debug(`SMS envoyé à ${phoneNumber}${requestId ? ` [${requestId}]` : ''}`);
    return requestId;
  } catch (err) {
    const errorCode = err instanceof Error ? err.message : String(err);
    logger.error(`Échec envoi SMS à ${phoneNumber}`, err);

    if (logId) {
      await prisma.smsLog.update({
        where: { id: logId },
        data: { status: 'failed', errorCode },
      }).catch((updateErr) => logger.warn('smsLog : échec mise à jour status failed', updateErr));

      // Fallback email pour les SMS OTP critiques
      if (options.isOtp) {
        logger.warn(`SMS OTP échoué pour ${phoneNumber} — fallback email si disponible`);
        await triggerOtpSmsFallback(phoneNumber, logId).catch(() => null);
      }
    }

    throw err;
  }
}

/**
 * Déclenche un fallback email lorsqu'un SMS OTP n'a pas pu être envoyé.
 * Cherche l'utilisateur par téléphone et lui envoie une notification de support.
 */
async function triggerOtpSmsFallback(phone: string, logId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { phone },
    select: { email: true, firstName: true },
  });
  if (!user) return;

  // Import dynamique pour éviter les dépendances circulaires
  const { sendEmail } = await import('./mailer');
  await sendEmail({
    to: [{ email: user.email, name: user.firstName }],
    subject: 'Code de vérification Primeo (SMS indisponible)',
    htmlContent: `
      <p>Bonjour ${user.firstName},</p>
      <p>Nous n'avons pas pu vous envoyer votre code de vérification par SMS.</p>
      <p>Votre code OTP a été envoyé par SMS — si vous ne l'avez pas reçu, veuillez contacter notre support.</p>
      <p style="font-size:12px;color:#888;">Référence technique : smsLog=${logId}</p>
    `,
  }).catch((emailErr) => logger.warn('Fallback email OTP échoué', emailErr));
}

export function generateOtp(): string {
  const length = orangeSmsConfig.otpLength;
  return Math.floor(Math.random() * Math.pow(10, length))
    .toString()
    .padStart(length, '0');
}
