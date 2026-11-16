// Norasend — API de messagerie WhatsApp Business / Telegram (https://api.norasend.com)
import { env } from './env.config';

export const norasendConfig = {
  baseUrl: env.NORASEND_API_URL.replace(/\/+$/, ''),
  apiKey: env.NORASEND_API_KEY,
  authScheme: env.NORASEND_AUTH_SCHEME,
  whatsappSessionId: env.WHATSAPP_SESSION_ID,
  telegramBotId: env.TELEGRAM_BOT_ID,
  timeoutMs: 30_000,
  // Limite documentée par Norasend : 100 destinataires par appel de diffusion
  maxBroadcastBatch: 100,
} as const;
