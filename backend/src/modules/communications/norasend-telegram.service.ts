// Envois Telegram via Norasend.
//   POST /api/v1/telegram/send       — un message (texte ou média)
//   POST /api/v1/telegram/broadcast  — diffusion (jusqu'à 100 chats par appel)
import { norasendPost, norasendGet, type NorasendResult } from './norasend.client';
import { norasendConfig } from '../../config/norasend.config';
import { HttpError } from '../../common/handlers/http-error.handler';

const SEND_PATH = '/api/v1/telegram/send';
const BROADCAST_PATH = '/api/v1/telegram/broadcast';

export type TelegramParseMode = 'HTML' | 'Markdown' | 'MarkdownV2';

const IMAGE_EXT = /\.(jpe?g|png|gif|webp)(\?.*)?$/i;

/**
 * Envoie un message Telegram.
 * @param chatId    identifiant du chat ou « @canal »
 * @param mediaUrl  URL publique (https) d'un média à joindre
 * @param caption   légende du média (par défaut : le texte)
 * @param parseMode mise en forme du texte (HTML, Markdown, MarkdownV2)
 */
export async function sendTelegramMessage(
  chatId: string,
  text: string,
  mediaUrl?: string,
  caption?: string,
  parseMode?: TelegramParseMode,
): Promise<NorasendResult> {
  if (!chatId) throw new HttpError(400, 'chatId Telegram requis');
  if (!text && !mediaUrl) throw new HttpError(400, 'Un texte ou un média est requis');

  const body: Record<string, unknown> = mediaUrl
    ? { chatId, type: IMAGE_EXT.test(mediaUrl) ? 'photo' : 'document', mediaUrl, caption: caption ?? text }
    : { chatId, type: 'text', text };
  if (parseMode) body.parseMode = parseMode;
  return norasendPost(SEND_PATH, body);
}

/** Diffuse un texte à plusieurs chats (100 maximum par appel). */
export async function broadcastTelegram(
  chatIds: string[],
  text: string,
  delayMs?: number,
): Promise<NorasendResult> {
  const { min, max } = norasendConfig.telegramDelayMs;
  if (delayMs !== undefined && (!Number.isInteger(delayMs) || delayMs < min || delayMs > max)) {
    throw new HttpError(400, `delayMs Telegram : entier entre ${min} et ${max}`);
  }
  if (chatIds.length === 0) throw new HttpError(400, 'Aucun chat');
  if (chatIds.length > norasendConfig.maxBroadcastBatch) {
    throw new HttpError(400, `Une diffusion Telegram est limitée à ${norasendConfig.maxBroadcastBatch} chats par appel`);
  }
  const body: Record<string, unknown> = { chatIds, text };
  if (delayMs !== undefined) body.delayMs = delayMs;
  return norasendPost(BROADCAST_PATH, body);
}

/** Quota et état du bot Telegram (409 = bot non connecté). */
export async function getTelegramQuota(): Promise<Record<string, unknown>> {
  return (await norasendGet('/api/v1/telegram/quota')).data;
}
