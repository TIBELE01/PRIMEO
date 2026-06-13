// Brevo (formerly Sendinblue) email service configuration
import { env } from './env.config';

export const brevoConfig = {
  apiKey: env.BREVO_API_KEY,
  senderEmail: 'noreply@primeo.ci',
  senderName: 'PRIMEO',
  baseUrl: 'https://api.brevo.com/v3',
  smtp: {
    host: env.BREVO_SMTP_HOST ?? 'smtp-relay.brevo.com',
    port: env.BREVO_SMTP_PORT ?? 587,
    user: env.BREVO_SMTP_USER,
    pass: env.BREVO_SMTP_PASS,
  },
  // Template IDs (configured in Brevo dashboard)
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
