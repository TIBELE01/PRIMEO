// Norasend — API de messagerie WhatsApp / Telegram (https://norasend.com/docs/api)
// Le numéro WhatsApp (QR code) et le bot Telegram sont rattachés à l'espace de travail
// depuis le tableau de bord Norasend : la clé d'API suffit à les désigner.
import { env } from './env.config';

export const norasendConfig = {
  baseUrl: env.NORASEND_API_URL.replace(/\/+$/, ''),
  apiKey: env.NORASEND_API_KEY,
  // « bearer » : Authorization: Bearer <clé> — « x-api-key » : X-Api-Key: <clé> (les deux sont acceptés)
  authScheme: env.NORASEND_AUTH_SCHEME,
  timeoutMs: 30_000,
  // Nouvel essai (429 uniquement) : 1 s, 2 s…
  retryBaseMs: 1000,
  maxRetries: 2,
  // Limites documentées
  maxBroadcastBatch: 100, // 100 destinataires par appel (WhatsApp et Telegram)
  whatsappDelayMs: { min: 3000, max: 30_000, default: 4000 },
  telegramDelayMs: { min: 500, max: 10_000, default: 1000 },
} as const;
