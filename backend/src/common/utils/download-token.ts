// Jetons de téléchargement signés pour les documents générés à la volée
// (factures, exports). Le contenu est chiffré (AES-256-GCM via secret-crypto) et
// porte une date d'expiration : un lien ne peut être ni forgé ni réutilisé après
// expiration. Les PDF/CSV ne sont jamais stockés — ils sont régénérés à la demande
// par la route /api/downloads, ce qui évite toute dépendance à la livraison de PDF
// par un CDN tiers (Cloudinary bloque la livraison des PDF par défaut).
import { encryptSecret, decryptSecret } from './secret-crypto';
import { HttpError } from '../handlers/http-error.handler';

export type DownloadKind = 'binv' | 'sinv' | 'exp'; // facture résa / facture abo / export

export interface DownloadTokenPayload {
  k: DownloadKind;
  id?: string; // identifiant de ressource (export)
  d?: unknown; // données inline (facture)
  exp: number; // expiration (epoch ms)
}

// base64url pour passer le jeton chiffré en paramètre d'URL sans échappement.
const toUrlSafe = (s: string): string => Buffer.from(s, 'utf8').toString('base64url');
const fromUrlSafe = (s: string): string => Buffer.from(s, 'base64url').toString('utf8');

export function createDownloadToken(payload: Omit<DownloadTokenPayload, 'exp'>, ttlMs: number): string {
  const full: DownloadTokenPayload = { ...payload, exp: Date.now() + ttlMs };
  return toUrlSafe(encryptSecret(JSON.stringify(full)));
}

export function verifyDownloadToken(token: string): DownloadTokenPayload {
  let payload: DownloadTokenPayload;
  try {
    payload = JSON.parse(decryptSecret(fromUrlSafe(token))) as DownloadTokenPayload;
  } catch {
    throw new HttpError(401, 'Lien de téléchargement invalide.');
  }
  if (!payload?.exp || payload.exp < Date.now()) {
    throw new HttpError(410, 'Lien de téléchargement expiré. Régénérez le document.');
  }
  return payload;
}
