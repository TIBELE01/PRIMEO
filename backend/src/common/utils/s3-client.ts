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

export async function uploadToCloudinary(
  fileBuffer: Buffer,
  folder: string,
  filename: string
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
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
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

export async function deleteFromCloudinary(publicId: string): Promise<void> {
  const { cloudName, apiKey, apiSecret } = cloudinaryConfig;
  if (!cloudName || !apiKey || !apiSecret) return;

  await axios.post(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`,
    { public_id: publicId },
    { auth: { username: apiKey, password: apiSecret } }
  );
  logger.debug(`Cloudinary delete: ${publicId}`);
}
