// Cloudinary upload helper — replaces S3 for media storage
import axios from 'axios';
import FormData from 'form-data';
import { cloudinaryConfig } from '../../config/cloudinary.config';
import { logger } from './logger';

export interface UploadResult {
  url: string;
  publicId: string;
  format: string;
  bytes: number;
}

// Type de ressource Cloudinary : 'image' pour les photos, 'auto' pour gérer
// indifféremment images ET PDF (documents KYC, factures…), 'raw' pour binaire pur.
export type CloudinaryResourceType = 'image' | 'auto' | 'raw';

export async function uploadToCloudinary(
  fileBuffer: Buffer,
  folder: string,
  filename: string,
  resourceType: CloudinaryResourceType = 'image'
): Promise<UploadResult> {
  const { cloudName, apiKey, apiSecret } = cloudinaryConfig;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Cloudinary credentials not configured');
  }

  const form = new FormData();
  form.append('file', fileBuffer, { filename });
  form.append('folder', folder);
  form.append('api_key', apiKey);

  const timestamp = Math.floor(Date.now() / 1000).toString();
  form.append('timestamp', timestamp);

  const response = await axios.post(
    `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
    form,
    { headers: form.getHeaders(), auth: { username: apiKey, password: apiSecret } }
  );

  logger.debug(`Cloudinary upload success: ${response.data.public_id}`);
  return {
    url: response.data.secure_url,
    publicId: response.data.public_id,
    format: response.data.format,
    bytes: response.data.bytes,
  };
}

// Construit une URL de livraison optimisée à la volée : conversion automatique
// en WebP/AVIF selon le navigateur (f_auto), qualité auto (q_auto) et
// redimensionnement (w_…). Insère la chaîne de transformation après /upload/.
export function buildImageDeliveryUrl(
  secureUrl: string,
  opts: { width?: number } = {},
): string {
  if (!secureUrl.includes('/upload/')) return secureUrl;
  // f_auto livre WebP/AVIF selon le navigateur, q_auto ajuste la compression
  const parts = ['f_auto', 'q_auto'];
  if (opts.width) parts.push(`w_${opts.width}`, 'c_limit');
  return secureUrl.replace('/upload/', `/upload/${parts.join(',')}/`);
}

export async function deleteFromCloudinary(
  publicId: string,
  resourceType: CloudinaryResourceType = 'image',
): Promise<void> {
  const { cloudName, apiKey, apiSecret } = cloudinaryConfig;
  if (!cloudName || !apiKey || !apiSecret) return;

  // 'auto' n'est pas un type valide pour destroy → repli sur 'image'
  const type = resourceType === 'auto' ? 'image' : resourceType;
  await axios.post(
    `https://api.cloudinary.com/v1_1/${cloudName}/${type}/destroy`,
    { public_id: publicId },
    { auth: { username: apiKey, password: apiSecret } }
  );
  logger.debug(`Cloudinary delete (${type}): ${publicId}`);
}
