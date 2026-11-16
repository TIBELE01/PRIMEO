// Envois WhatsApp Business via Norasend.
//   POST /api/v1/whatsapp/send       — un message (texte, image ou fichier)
//   POST /api/v1/whatsapp/broadcast  — diffusion (jusqu'à 100 destinataires par appel)
//
// ⚠️ Norasend déconseille les envois massifs non sollicités sur une session WhatsApp
// « non officielle » (risque de bannissement du numéro) : pour le marketing de masse,
// privilégier WhatsApp Pro (API officielle Meta) et n'écrire qu'à des contacts consentants.
import { norasendPost, type NorasendResult } from './norasend.client';
import { norasendConfig } from '../../config/norasend.config';
import { HttpError } from '../../common/handlers/http-error.handler';

const SEND_PATH = '/api/v1/whatsapp/send';
const BROADCAST_PATH = '/api/v1/whatsapp/broadcast';

const IMAGE_EXT = /\.(jpe?g|png|gif|webp)(\?.*)?$/i;

/** « image » si l'URL pointe vers une image, sinon « file » (document). */
function mediaTypeOf(mediaUrl: string): 'image' | 'file' {
  return IMAGE_EXT.test(mediaUrl) ? 'image' : 'file';
}

const withSession = (body: Record<string, unknown>): Record<string, unknown> =>
  norasendConfig.whatsappSessionId ? { ...body, sessionId: norasendConfig.whatsappSessionId } : body;

/**
 * Envoie un message WhatsApp à un destinataire.
 * @param to        numéro au format international sans « + » (ex. 2250700000000)
 * @param text      texte du message
 * @param mediaUrl  URL publique (https) d'une image ou d'un fichier à joindre
 * @param caption   légende de la pièce jointe (par défaut : le texte)
 */
export async function sendWhatsAppMessage(
  to: string,
  text: string,
  mediaUrl?: string,
  caption?: string,
): Promise<NorasendResult> {
  if (!to) throw new HttpError(400, 'Destinataire WhatsApp requis');
  if (!text && !mediaUrl) throw new HttpError(400, 'Un texte ou une pièce jointe est requis');

  const body: Record<string, unknown> = mediaUrl
    ? { to, type: mediaTypeOf(mediaUrl), mediaUrl, caption: caption ?? text }
    : { to, type: 'text', text };
  return norasendPost(SEND_PATH, withSession(body));
}

/**
 * Diffuse un message à plusieurs destinataires (100 maximum par appel).
 * @param recipients numéros au format international sans « + »
 * @param variables  valeurs substituées dans le texte ({{prenom}}…) par Norasend
 * @param delayMs    pause entre deux envois, pour limiter le risque de blocage
 */
export async function broadcastWhatsApp(
  recipients: string[],
  text: string,
  variables?: Record<string, string>,
  delayMs?: number,
): Promise<NorasendResult> {
  if (recipients.length === 0) throw new HttpError(400, 'Aucun destinataire');
  if (recipients.length > norasendConfig.maxBroadcastBatch) {
    throw new HttpError(400, `Une diffusion WhatsApp est limitée à ${norasendConfig.maxBroadcastBatch} destinataires par appel`);
  }
  const body: Record<string, unknown> = { recipients, text };
  if (variables && Object.keys(variables).length > 0) body.variables = variables;
  if (delayMs !== undefined) body.delayMs = delayMs;
  return norasendPost(BROADCAST_PATH, withSession(body));
}
