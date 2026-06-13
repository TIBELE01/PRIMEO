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
    exports: 'primeo/exports',
    website: 'primeo/website',
    reviews: 'primeo/reviews',
  },
  maxFileSizeBytes: 10 * 1024 * 1024, // 10 MB (plafond global multer)
  // Plafonds différenciés par type de fichier (§2 — uploads sécurisés)
  maxImageBytes: 5 * 1024 * 1024, // 5 MB pour les images
  maxPdfBytes: 10 * 1024 * 1024, // 10 MB pour les PDF
  allowedFormats: ['jpg', 'jpeg', 'png', 'webp', 'pdf'],
  allowedImageMimes: ['image/jpeg', 'image/png', 'image/webp'],
  allowedPdfMimes: ['application/pdf'],
} as const;
