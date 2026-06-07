// Client API REST Genius Pay — initiation de paiement et requêtes de statut (pay.genius.ci)
// Doc : https://pay.genius.ci/docs/api
import axios from 'axios';
import { geniusPayConfig } from '../../../config/genius-pay.config';
import { env } from '../../../config/env.config';
import { logger } from '../../../common/utils/logger';

export interface GeniusPayInitiateResponse {
  checkoutUrl: string;
  reference: string;
}

// En-têtes d'authentification Genius Pay : clé publique + clé secrète (jamais côté client)
function authHeaders(): Record<string, string> {
  return {
    'X-API-Key': geniusPayConfig.apiKey ?? '',
    'X-API-Secret': geniusPayConfig.secretKey ?? '',
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
}

// Extrait le corps utile : Genius Pay encapsule la réponse dans { success, data }
function unwrap(responseData: unknown): Record<string, unknown> {
  if (responseData && typeof responseData === 'object') {
    const obj = responseData as Record<string, unknown>;
    if (obj.data && typeof obj.data === 'object') {
      return obj.data as Record<string, unknown>;
    }
    return obj;
  }
  return {};
}

// Renvoie la première valeur définie parmi les clés candidates, convertie en chaîne
function pick(data: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = data[key];
    if (value !== undefined && value !== null) return String(value);
  }
  return undefined;
}

export const geniusPayService = {
  async initiatePayment(params: {
    amount: number;
    bookingId: string;
    customerEmail: string;
    customerPhone?: string;
    customerName?: string;
    returnUrl: string;
  }): Promise<GeniusPayInitiateResponse> {
    if (!geniusPayConfig.apiKey || !geniusPayConfig.secretKey) {
      throw new Error('Genius Pay non configuré (clés API manquantes)');
    }

    // Genius Pay détecte le pays/opérateur/devise à partir du numéro de téléphone
    if (!params.customerPhone) {
      throw new Error('Numéro de téléphone du client requis pour le paiement Genius Pay');
    }

    // URL de notification serveur-à-serveur (webhook) — distincte de la redirection navigateur.
    // Le routeur webhooks est monté sous /api/webhooks (voir app.ts).
    const webhookUrl = `${env.BACKEND_URL}/api/webhooks/genius-pay`;

    // POST /payments — création d'un paiement avec redirection vers la page de checkout.
    // return_url : redirection du navigateur après paiement (frontend).
    // webhook_url / callback_url : notification serveur-à-serveur (backend).
    const response = await axios.post(
      `${geniusPayConfig.baseUrl}/payments`,
      {
        amount: params.amount,
        currency: geniusPayConfig.currency,
        customer: {
          name: params.customerName,
          phone: params.customerPhone,
          email: params.customerEmail,
        },
        return_url: params.returnUrl,
        redirect_url: params.returnUrl,
        callback_url: webhookUrl,
        webhook_url: webhookUrl,
        notify_url: webhookUrl,
        metadata: { booking_id: params.bookingId },
      },
      { headers: authHeaders() },
    );

    const data = unwrap(response.data);

    // Normaliser les noms de champs de l'URL de checkout
    const checkoutUrl = pick(data, ['checkout_url', 'payment_url', 'redirect_url', 'url']);

    // Normaliser la référence de transaction
    const reference = pick(data, ['reference', 'transaction_id', 'order_id', 'id']);

    if (!checkoutUrl) {
      logger.error('Genius Pay : URL de checkout manquante dans la réponse', { data });
      throw new Error(
        `URL de paiement manquante dans la réponse Genius Pay. Champs reçus : ${Object.keys(data).join(', ')}`,
      );
    }

    logger.debug(`Genius Pay paiement initié : ${reference}`);
    return { checkoutUrl, reference: reference ?? '' };
  },

  async getPaymentStatus(reference: string): Promise<{ status: string; amount: number }> {
    const response = await axios.get(`${geniusPayConfig.baseUrl}/payments/${reference}`, {
      headers: authHeaders(),
      timeout: 8000, // éviter que le sondage coté client reste bloqué indéfiniment
    });
    const data = unwrap(response.data);
    return { status: String(data.status ?? 'unknown'), amount: Number(data.amount ?? 0) };
  },

  // Débit serveur-à-serveur pour la facturation récurrente des abonnements
  async chargeRecurring(params: {
    subscriptionId: string;
    amount: number;
    customerEmail: string;
    customerPhone?: string;
    description: string;
  }): Promise<{ success: boolean; reference: string; error?: string }> {
    if (!geniusPayConfig.apiKey || !geniusPayConfig.secretKey) {
      throw new Error('Genius Pay non configuré (clés API manquantes)');
    }

    try {
      const response = await axios.post(
        `${geniusPayConfig.baseUrl}/payments/charge`,
        {
          amount: params.amount,
          currency: geniusPayConfig.currency,
          customer: { phone: params.customerPhone, email: params.customerEmail },
          description: params.description,
          recurring: true,
          metadata: { subscription_id: params.subscriptionId },
        },
        { headers: authHeaders() },
      );

      const data = unwrap(response.data);
      const reference = pick(data, ['reference', 'transaction_id', 'id']) ?? '';
      const status = String(data.status ?? '');
      logger.debug(`Genius Pay débit récurrent : ${reference}`);
      return { success: status === 'success' || status === 'completed', reference };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.warn(`Échec du débit récurrent Genius Pay : ${message}`);
      return { success: false, reference: '', error: message };
    }
  },

  // Rembourser un paiement précédemment réalisé (partiel ou total)
  async refundPayment(params: {
    originalReference: string;
    amount: number;
    reason: string;
  }): Promise<{ reference: string }> {
    if (!geniusPayConfig.apiKey || !geniusPayConfig.secretKey) {
      throw new Error('Genius Pay non configuré (clés API manquantes)');
    }

    const response = await axios.post(
      `${geniusPayConfig.baseUrl}/payments/${params.originalReference}/refund`,
      {
        amount: params.amount,
        currency: geniusPayConfig.currency,
        reason: params.reason,
      },
      { headers: authHeaders() },
    );

    const data = unwrap(response.data);
    const reference = pick(data, ['reference', 'transaction_id', 'id']) ?? '';
    logger.debug(`Genius Pay remboursement initié : ${reference}`);
    return { reference };
  },
};
