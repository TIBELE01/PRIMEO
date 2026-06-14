// Brevo (formerly Sendinblue) email service configuration
import { env } from './env.config';

export const brevoConfig = {
  apiKey: env.BREVO_API_KEY,
  senderEmail: 'support.primeo@gmail.com',
  senderName: 'PRIMEO',
  baseUrl: 'https://api.brevo.com/v3',
  // Template IDs — identifiants internes utilisés pour sélectionner le bon HTML local.
  // Les templates sont rendus côté serveur (renderLocalTemplate) et envoyés via l'API
  // Brevo en HTML brut : aucun template à créer dans le dashboard Brevo.
  templates: {
    welcomeClient: 1,
    welcomeProfessional: 2,
    bookingConfirmation: 3,
    bookingCancellation: 4,
    paymentReceipt: 5,
    kycApproved: 6,
    kycRejected: 7,
    subscriptionRenewal: 8,
    boostExpiryReminder: 8,
    otpCode: 9,
    passwordReset: 10,
    referralReward: 11,
  },
} as const;
