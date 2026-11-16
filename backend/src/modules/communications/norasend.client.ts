// Client HTTP Norasend — authentification, délai d'attente, erreurs normalisées.
//
// La clé d'API n'apparaît JAMAIS dans les journaux ni dans les messages d'erreur.
import axios, { AxiosError, AxiosInstance } from 'axios';
import { norasendConfig } from '../../config/norasend.config';
import { HttpError } from '../../common/handlers/http-error.handler';
import { logger } from '../../common/utils/logger';

export interface NorasendResult {
  /** HTTP 2xx et aucun indicateur d'échec dans la réponse. */
  ok: boolean;
  /** Identifiant de message renvoyé par Norasend, s'il y en a un. */
  messageId: string | null;
  /** Détail par destinataire (diffusion), si Norasend le fournit. */
  results: Array<{ to: string; ok: boolean; messageId: string | null; error: string | null }> | null;
  error: string | null;
  /** Réponse brute (tronquée) pour la traçabilité. */
  raw: unknown;
}

let instance: AxiosInstance | null = null;

function http(): AxiosInstance {
  if (!instance) {
    instance = axios.create({
      baseURL: norasendConfig.baseUrl,
      timeout: norasendConfig.timeoutMs,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    });
  }
  return instance;
}

export function isNorasendConfigured(): boolean {
  return !!norasendConfig.apiKey;
}

function authHeaders(): Record<string, string> {
  const key = norasendConfig.apiKey as string;
  return norasendConfig.authScheme === 'x-api-key'
    ? { 'X-API-Key': key }
    : { Authorization: `Bearer ${key}` };
}

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : typeof v === 'number' ? String(v) : null);

/** Lecture défensive de la réponse : le format exact n'est pas garanti. */
export function parseNorasendResponse(body: unknown): NorasendResult {
  const data = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const failed = data.success === false || data.ok === false || (data.error != null && data.error !== false);
  const error = failed ? str(data.error) ?? str(data.message) ?? 'Échec signalé par Norasend' : null;

  const messageId = str(data.messageId) ?? str(data.id) ?? str((data.data as Record<string, unknown> | undefined)?.messageId) ?? null;

  const list = [data.results, data.messages, data.data].find(Array.isArray) as unknown[] | undefined;
  const results = list
    ? list
        .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
        .map((item) => {
          const itemFailed = item.success === false || item.ok === false || item.error != null || item.status === 'failed';
          return {
            to: str(item.to) ?? str(item.chatId) ?? str(item.recipient) ?? '',
            ok: !itemFailed,
            messageId: str(item.messageId) ?? str(item.id),
            error: itemFailed ? str(item.error) ?? str(item.message) ?? 'Échec' : null,
          };
        })
    : null;

  const raw = JSON.parse(JSON.stringify(body ?? null, (_k, v) => (typeof v === 'string' && v.length > 500 ? v.slice(0, 500) + '…' : v)));
  return { ok: !failed, messageId, results: results && results.length > 0 ? results : null, error, raw };
}

/** POST authentifié. Lève HttpError (502/503) si l'appel n'aboutit pas. */
export async function norasendPost(path: string, body: Record<string, unknown>): Promise<NorasendResult> {
  if (!isNorasendConfigured()) {
    throw new HttpError(503, 'Norasend n\'est pas configuré (NORASEND_API_KEY manquante).');
  }
  try {
    const res = await http().post(path, body, { headers: authHeaders() });
    return parseNorasendResponse(res.data);
  } catch (err) {
    const e = err as AxiosError<{ error?: unknown; message?: unknown }>;
    const status = e.response?.status;
    const detail = str(e.response?.data?.error) ?? str(e.response?.data?.message) ?? e.message;
    logger.warn('Norasend : appel échoué', { path, status, detail });
    if (status === 401 || status === 403) {
      throw new HttpError(502, 'Norasend a refusé l\'authentification : vérifiez NORASEND_API_KEY et NORASEND_AUTH_SCHEME.');
    }
    if (status === 429) throw new HttpError(429, 'Norasend : trop de requêtes. Réessayez plus tard.');
    throw new HttpError(502, `Échec de l'appel Norasend${status ? ` (HTTP ${status})` : ''} : ${detail}`);
  }
}

/** Réinitialise le client (tests). */
export function _resetNorasendClient(): void {
  instance = null;
}
