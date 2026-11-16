// Client HTTP Norasend — authentification, délai d'attente, enveloppe de réponse et
// erreurs normalisées, selon https://norasend.com/docs/api
//
// Toute réponse (succès ou erreur) a la forme :
//   { success, data, error: { code, type, message, field } | null, timestamp }
// « success: true » signifie ACCEPTÉ (message mis en file), pas LIVRÉ.
//
// La clé d'API n'apparaît JAMAIS dans les journaux ni dans les messages d'erreur.
import axios, { AxiosError, AxiosInstance } from 'axios';
import { norasendConfig } from '../../config/norasend.config';
import { HttpError } from '../../common/handlers/http-error.handler';
import { logger } from '../../common/utils/logger';

export interface NorasendResult {
  /** Requête acceptée par Norasend (envoi mis en file). */
  ok: boolean;
  /** Identifiant du message (envoi simple). */
  messageId: string | null;
  /** Diffusion WhatsApp : nombre de messages acceptés (réponse 202). */
  accepted: number | null;
  /** Diffusion WhatsApp : destinataires écartés (quota dépassé ou numéro invalide). */
  skipped: number;
  /** Diffusion Telegram : un message par chat. */
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
  return norasendConfig.authScheme === 'x-api-key' ? { 'X-Api-Key': key } : { Authorization: `Bearer ${key}` };
}

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : typeof v === 'number' ? String(v) : null);
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

interface NorasendError { code: number | null; type: string | null; message: string; field: string | null }

function errorOf(body: unknown): NorasendError | null {
  const e = obj(obj(body).error);
  if (Object.keys(e).length === 0) return null;
  return {
    code: typeof e.code === 'number' ? e.code : null,
    type: str(e.type),
    message: str(e.message) ?? 'Erreur signalée par Norasend',
    field: str(e.field),
  };
}

/** Lecture de l'enveloppe de réponse. */
export function parseNorasendResponse(body: unknown): NorasendResult {
  const root = obj(body);
  const data = obj(root.data);
  const err = errorOf(body);
  const failed = root.success === false || err !== null;

  const messages = Array.isArray(data.messages) ? data.messages : null;
  const results = messages
    ? messages
        .map((m) => obj(m))
        .filter((m) => Object.keys(m).length > 0)
        .map((m) => {
          const bad = m.status === 'FAILED' || m.success === false;
          return { to: str(m.chatId) ?? str(m.to) ?? '', ok: !bad, messageId: str(m.messageId), error: bad ? str(m.failReason) ?? 'Échec' : null };
        })
    : null;

  const skippedQuota = typeof data.skippedQuota === 'number' ? data.skippedQuota : 0;
  const skippedInvalid = typeof data.skippedInvalid === 'number' ? data.skippedInvalid : 0;

  const raw = JSON.parse(JSON.stringify(body ?? null, (_k, v) => (typeof v === 'string' && v.length > 500 ? v.slice(0, 500) + '…' : v)));
  return {
    ok: !failed,
    messageId: str(data.messageId),
    accepted: typeof data.accepted === 'number' ? data.accepted : null,
    skipped: skippedQuota + skippedInvalid,
    results: results && results.length > 0 ? results : null,
    error: failed ? err?.message ?? 'Échec signalé par Norasend' : null,
    raw,
  };
}

/** Traduit une erreur HTTP de Norasend en erreur claire pour l'administrateur. */
function translateError(status: number, body: unknown): HttpError {
  const e = errorOf(body);
  const code = e?.code ?? null;
  const detail = e ? `${e.message}${e.field ? ` (champ « ${e.field} »)` : ''}` : '';
  const meta = { norasendCode: code };

  if (status === 401) {
    return new HttpError(502, `Norasend refuse la clé d'API${code ? ` (code ${code})` : ''} : vérifiez NORASEND_API_KEY.`, meta);
  }
  if (status === 402) {
    return new HttpError(402, `Abonnement, quota ou solde Norasend${code ? ` (code ${code})` : ''} : ${detail || 'envoi non couvert'}. Consultez votre compte Norasend.`, meta);
  }
  if (status === 403) return new HttpError(403, `Norasend : action non autorisée${code ? ` (code ${code})` : ''} — ${detail}`, meta);
  if (status === 409) {
    return new HttpError(409, 'Canal non connecté dans Norasend : reconnectez le numéro WhatsApp (QR code) ou le bot Telegram depuis le tableau de bord Norasend.', meta);
  }
  if (status === 422) return new HttpError(422, `Message refusé par Norasend : ${detail}`, meta);
  if (status === 400) return new HttpError(400, `Requête refusée par Norasend : ${detail}`, meta);
  if (status === 429) return new HttpError(429, 'Norasend : trop de requêtes (500 par minute). Réessayez dans une minute.', meta);
  // 500 / 502 : l'envoi a peut-être été pris en compte — l'API n'a pas de clé d'idempotence
  return new HttpError(502, `Erreur Norasend (HTTP ${status})${detail ? ` : ${detail}` : ''}. Le message a pu être mis en file : vérifiez l'historique Norasend avant de renvoyer.`, meta);
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

async function call(method: 'get' | 'post', path: string, body?: Record<string, unknown>): Promise<NorasendResult> {
  if (!isNorasendConfigured()) {
    throw new HttpError(503, 'Norasend n\'est pas configuré (NORASEND_API_KEY manquante).');
  }
  for (let attempt = 0; ; attempt++) {
    try {
      const res = method === 'get'
        ? await http().get(path, { headers: authHeaders() })
        : await http().post(path, body, { headers: authHeaders() });
      return parseNorasendResponse(res.data);
    } catch (err) {
      const e = err as AxiosError;
      const status = e.response?.status;
      if (!status) {
        // Pas de réponse (réseau, délai dépassé) : renvoyer pourrait créer un doublon
        logger.warn('Norasend : aucune réponse', { path, reason: e.code ?? e.message });
        throw new HttpError(502, 'Aucune réponse de Norasend (délai dépassé ou réseau). Le message a pu partir : vérifiez l\'historique Norasend avant de renvoyer.');
      }
      // 429 : la requête n'a pas été traitée, on peut réessayer sans risque de doublon
      if (status === 429 && attempt < norasendConfig.maxRetries) {
        await sleep(norasendConfig.retryBaseMs * 2 ** attempt);
        continue;
      }
      const translated = translateError(status, e.response?.data);
      logger.warn('Norasend : appel refusé', { path, status, code: (translated.details as { norasendCode?: number } | undefined)?.norasendCode });
      throw translated;
    }
  }
}

/** POST authentifié. Lève HttpError si l'appel n'aboutit pas. */
export const norasendPost = (path: string, body: Record<string, unknown>): Promise<NorasendResult> => call('post', path, body);

/** GET authentifié. */
export const norasendGet = (path: string): Promise<NorasendResult & { data: Record<string, unknown> }> =>
  call('get', path).then((r) => ({ ...r, data: obj(obj(r.raw).data) }));

/** Réinitialise le client (tests). */
export function _resetNorasendClient(): void {
  instance = null;
}
