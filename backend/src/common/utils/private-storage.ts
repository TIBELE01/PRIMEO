// Stockage privé de fichiers sensibles (CV de candidats…) — Supabase Storage.
// Les fichiers ne sont JAMAIS servis par un CDN public : ils sont lus côté serveur
// et renvoyés par la route /api/downloads/cv (lien signé et expirant). Cela évite le
// blocage de livraison des PDF par Cloudinary et accepte les documents Word.
import axios from 'axios';
import crypto from 'crypto';
import { env } from '../../config/env.config';
import { logger } from './logger';

export const CV_BUCKET = 'careers-cv';
export const STORAGE_PREFIX = 'storage:'; // marqueur stocké dans cvUrl : storage:<bucket>/<chemin>

const ALLOWED: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  rtf: 'application/rtf',
  odt: 'application/vnd.oasis.opendocument.text',
};

export function extensionOf(filename: string): string {
  const m = /\.([A-Za-z0-9]{2,5})$/.exec(filename.trim());
  return m ? m[1].toLowerCase() : '';
}

export function contentTypeFor(filename: string): string {
  return ALLOWED[extensionOf(filename)] ?? 'application/octet-stream';
}

export function isAllowedDocument(filename: string): boolean {
  return extensionOf(filename) in ALLOWED;
}

export const safeFilename = (name: string): string => name.replace(/[^a-zA-Z0-9._-]/g, '_');

const base = () => `${env.SUPABASE_URL.replace(/\/+$/, '')}/storage/v1`;
const headers = (extra: Record<string, string> = {}) => ({
  Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
  apikey: env.SUPABASE_SERVICE_ROLE_KEY,
  ...extra,
});

async function ensureBucket(bucket: string): Promise<void> {
  try {
    await axios.post(`${base()}/bucket`, { id: bucket, name: bucket, public: false, file_size_limit: 10 * 1024 * 1024 }, { headers: headers({ 'Content-Type': 'application/json' }) });
  } catch (err) {
    const status = (err as { response?: { status?: number } }).response?.status;
    if (status !== 409 && status !== 400) throw err; // déjà existant
  }
}

/** Envoie un fichier dans un bucket privé ; renvoie le chemin à mémoriser (storage:<bucket>/<chemin>). */
export async function uploadPrivateFile(bucket: string, filename: string, buffer: Buffer): Promise<string> {
  const path = `${new Date().getUTCFullYear()}/${crypto.randomBytes(8).toString('hex')}-${safeFilename(filename)}`;
  const put = () => axios.post(`${base()}/object/${bucket}/${path}`, buffer, {
    headers: headers({ 'Content-Type': contentTypeFor(filename), 'x-upsert': 'false' }),
    maxBodyLength: Infinity,
  });
  try {
    await put();
  } catch (err) {
    const data = (err as { response?: { status?: number; data?: { message?: string; error?: string } } }).response;
    if (data?.status === 404 || /bucket not found/i.test(data?.data?.message ?? data?.data?.error ?? '')) {
      await ensureBucket(bucket);
      await put();
    } else {
      logger.error(`Stockage privé : envoi refusé (${bucket}) : ${data?.data?.message ?? (err as Error).message}`);
      throw err;
    }
  }
  return `${STORAGE_PREFIX}${bucket}/${path}`;
}

export function parseStorageRef(ref: string | null | undefined): { bucket: string; path: string } | null {
  if (!ref || !ref.startsWith(STORAGE_PREFIX)) return null;
  const rest = ref.slice(STORAGE_PREFIX.length);
  const i = rest.indexOf('/');
  return i > 0 ? { bucket: rest.slice(0, i), path: rest.slice(i + 1) } : null;
}

export async function downloadPrivateFile(ref: string): Promise<Buffer> {
  const p = parseStorageRef(ref);
  if (!p) throw new Error('Référence de stockage invalide');
  const res = await axios.get(`${base()}/object/${p.bucket}/${p.path}`, { headers: headers(), responseType: 'arraybuffer', timeout: 20_000 });
  return Buffer.from(res.data);
}

export async function deletePrivateFile(ref: string): Promise<void> {
  const p = parseStorageRef(ref);
  if (!p) return;
  await axios.delete(`${base()}/object/${p.bucket}/${p.path}`, { headers: headers() });
}
