// Chiffrement symétrique des secrets transitoires (ex : refresh tokens en Redis)
// AES-256-GCM — clé dérivée de SUPABASE_SERVICE_ROLE_KEY (jamais stockée en clair).
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { env } from '../../config/env.config';

const ALGO = 'aes-256-gcm';
const IV_LENGTH = 12; // recommandé pour GCM

function getKey(): Buffer {
  // Dérivation déterministe : la clé service role est déjà un secret fort
  return createHash('sha256').update(env.SUPABASE_SERVICE_ROLE_KEY).digest();
}

/** Chiffre une chaîne en AES-256-GCM. Format de sortie : iv.tag.ciphertext (base64). */
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGO, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}.${tag.toString('base64')}.${encrypted.toString('base64')}`;
}

/** Déchiffre une chaîne produite par encryptSecret. Lève une erreur si altérée. */
export function decryptSecret(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split('.');
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error('Format de secret chiffré invalide');
  }
  const decipher = createDecipheriv(ALGO, getKey(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}
