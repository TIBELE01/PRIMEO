// Cloudinary upload helper — replaces S3 for media storage
import crypto from 'crypto';
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

// Type de ressource Cloudinary : 'image' pour les photos, 'video' pour les
// vidéos, 'auto' pour gérer indifféremment images ET PDF (documents KYC,
// factures…), 'raw' pour binaire pur.
export type CloudinaryResourceType = 'image' | 'video' | 'auto' | 'raw';

// Signature d'un appel signé Cloudinary : SHA-1 hexadécimale de la liste des
// paramètres (hors file, api_key, resource_type, cloud_name, signature) triés
// par clé sous la forme `clé=valeur&…`, concaténée à l'api_secret.
// Les endpoints /upload et /destroy EXIGENT cette signature (l'auth HTTP Basic
// vaut uniquement pour l'Admin API et renvoie 401 ici).
function signParams(params: Record<string, string>, apiSecret: string): string {
  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');
  return crypto.createHash('sha1').update(toSign + apiSecret).digest('hex');
}

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

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = signParams({ folder, timestamp }, apiSecret);

  const form = new FormData();
  form.append('file', fileBuffer, { filename });
  form.append('folder', folder);
  form.append('api_key', apiKey);
  form.append('timestamp', timestamp);
  form.append('signature', signature);

  const response = await axios.post(
    `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
    form,
    { headers: form.getHeaders() }
  );

  logger.debug(`Cloudinary upload success: ${response.data.public_id}`);
  return {
    url: response.data.secure_url,
    publicId: response.data.public_id,
    format: response.data.format,
    bytes: response.data.bytes,
  };
}

// Upload « par URL distante » : Cloudinary va chercher lui-même le fichier à
// l'adresse fournie (pas de téléchargement local). Utilisé par le script de
// migration pour rapatrier les médias hébergés ailleurs vers Cloudinary.
export async function uploadRemoteToCloudinary(
  remoteUrl: string,
  folder: string,
  resourceType: CloudinaryResourceType = 'image',
): Promise<UploadResult> {
  const { cloudName, apiKey, apiSecret } = cloudinaryConfig;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Cloudinary credentials not configured');
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = signParams({ folder, timestamp }, apiSecret);

  const form = new FormData();
  form.append('file', remoteUrl); // URL distante : Cloudinary la récupère
  form.append('folder', folder);
  form.append('api_key', apiKey);
  form.append('timestamp', timestamp);
  form.append('signature', signature);

  const response = await axios.post(
    `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
    form,
    { headers: form.getHeaders(), timeout: 60_000 },
  );

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

// Renomme/déplace un asset Cloudinary (un changement de public_id = un déplacement
// de dossier). Utilisé pour réorganiser la médiathèque en sous-dossiers par bien.
export async function renameCloudinaryAsset(
  fromPublicId: string,
  toPublicId: string,
  resourceType: CloudinaryResourceType = 'image',
): Promise<UploadResult> {
  const { cloudName, apiKey, apiSecret } = cloudinaryConfig;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Cloudinary credentials not configured');
  }
  const type = resourceType === 'auto' ? 'image' : resourceType;
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = signParams(
    { from_public_id: fromPublicId, to_public_id: toPublicId, timestamp },
    apiSecret,
  );

  const response = await axios.post(
    `https://api.cloudinary.com/v1_1/${cloudName}/${type}/rename`,
    { from_public_id: fromPublicId, to_public_id: toPublicId, api_key: apiKey, timestamp, signature },
    { timeout: 60_000 },
  );
  return {
    url: response.data.secure_url,
    publicId: response.data.public_id,
    format: response.data.format,
    bytes: response.data.bytes,
  };
}

// Aligne le « asset_folder » (dossier d'affichage dans la médiathèque Cloudinary,
// en mode dossiers dynamiques) sur le chemin du public_id. Utile après un rename :
// le rename change le public_id (URL de livraison) mais pas le dossier d'affichage.
export async function setCloudinaryAssetFolder(
  publicId: string,
  assetFolder: string,
  resourceType: CloudinaryResourceType = 'image',
): Promise<void> {
  const { cloudName, apiKey, apiSecret } = cloudinaryConfig;
  if (!cloudName || !apiKey || !apiSecret) return;
  const type = resourceType === 'auto' ? 'image' : resourceType;
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = signParams(
    { asset_folder: assetFolder, public_id: publicId, timestamp, type: 'upload' },
    apiSecret,
  );

  const form = new FormData();
  form.append('public_id', publicId);
  form.append('type', 'upload');
  form.append('asset_folder', assetFolder);
  form.append('api_key', apiKey);
  form.append('timestamp', timestamp);
  form.append('signature', signature);

  await axios.post(
    `https://api.cloudinary.com/v1_1/${cloudName}/${type}/explicit`,
    form,
    { headers: form.getHeaders(), timeout: 60_000 },
  );
}

export async function deleteFromCloudinary(
  publicId: string,
  resourceType: CloudinaryResourceType = 'image',
): Promise<void> {
  const { cloudName, apiKey, apiSecret } = cloudinaryConfig;
  if (!cloudName || !apiKey || !apiSecret) return;

  // 'auto' n'est pas un type valide pour destroy → repli sur 'image'
  const type = resourceType === 'auto' ? 'image' : resourceType;
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = signParams({ public_id: publicId, timestamp }, apiSecret);

  await axios.post(
    `https://api.cloudinary.com/v1_1/${cloudName}/${type}/destroy`,
    { public_id: publicId, api_key: apiKey, timestamp, signature },
  );
  logger.debug(`Cloudinary delete (${type}): ${publicId}`);
}
