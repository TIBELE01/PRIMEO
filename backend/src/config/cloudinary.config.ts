// Cloudinary media storage configuration — credentials parsed from CLOUDINARY_URL
import { cloudinaryParsed } from './env.config';

export const cloudinaryConfig = {
  cloudName: cloudinaryParsed?.cloudName,
  apiKey: cloudinaryParsed?.apiKey,
  apiSecret: cloudinaryParsed?.apiSecret,
  folders: {
    properties: 'primeo/properties',
    avatars: 'primeo/avatars',
    kyc: 'primeo/kyc',
    invoices: 'primeo/invoices',
    reports: 'primeo/reports',
    website: 'primeo/website',
  },
  maxFileSizeBytes: 10 * 1024 * 1024, // 10 MB
  allowedFormats: ['jpg', 'jpeg', 'png', 'webp', 'pdf'],
} as const;
