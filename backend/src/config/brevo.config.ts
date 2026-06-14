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
    bookingConfirmation: 3, // confirmation réservation — client
    bookingCancellation: 4,
    paymentReceipt: 5,
    kycApproved: 6,
    kycRejected: 7,
    subscriptionRenewal: 8, // facture / renouvellement d'abonnement
    otpCode: 9,
    passwordReset: 10,
    referralReward: 11,
    // Templates dédiés (auparavant mutualisés avec des génériques)
    bookingConfirmationPro: 12, // nouvelle réservation reçue — professionnel
    interestClient: 13, // expression d'intérêt immobilier — confirmation client
    interestPro: 14, // expression d'intérêt immobilier — notification professionnel
    newMessage: 15, // nouveau message reçu
    stayReminder: 16, // rappel de séjour (J-7 / J-1)
    reviewReceived: 17, // nouvel avis laissé — professionnel
    reviewReply: 18, // réponse du professionnel à un avis — client
    boostActivated: 19, // boost activé
    boostExpiryReminder: 20, // boost bientôt expiré
  },
} as const;
