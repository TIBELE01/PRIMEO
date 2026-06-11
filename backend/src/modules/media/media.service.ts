// Media service — delegates to Cloudinary client
import {
  uploadToCloudinary,
  deleteFromCloudinary,
  buildImageDeliveryUrl,
} from '../../common/utils/s3-client';
import { cloudinaryConfig } from '../../config/cloudinary.config';
import { HttpError } from '../../common/handlers/http-error.handler';

export const mediaService = {
  async upload(file: Express.Multer.File, folderKey: string) {
    const folder = cloudinaryConfig.folders[folderKey as keyof typeof cloudinaryConfig.folders]
      ?? cloudinaryConfig.folders.properties;

    const isImage = (cloudinaryConfig.allowedImageMimes as readonly string[]).includes(file.mimetype);
    const isPdf = (cloudinaryConfig.allowedPdfMimes as readonly string[]).includes(file.mimetype);
    if (!isImage && !isPdf) {
      throw new HttpError(400, `Type de fichier non autorisé : ${file.mimetype}`);
    }

    // Plafonds différenciés : 5 Mo pour les images, 10 Mo pour les PDF
    const maxBytes = isPdf ? cloudinaryConfig.maxPdfBytes : cloudinaryConfig.maxImageBytes;
    if (file.size > maxBytes) {
      throw new HttpError(
        400,
        `Le fichier dépasse la taille maximale de ${isPdf ? '10 Mo (PDF)' : '5 Mo (image)'}`,
      );
    }

    const result = await uploadToCloudinary(
      file.buffer,
      folder,
      file.originalname,
      isPdf ? 'auto' : 'image',
    );

    // Pour les images : renvoie aussi une URL de livraison optimisée (WebP + resize)
    return {
      ...result,
      optimizedUrl: isImage ? buildImageDeliveryUrl(result.url, { width: 1600 }) : result.url,
    };
  },

  async delete(publicId: string) {
    await deleteFromCloudinary(publicId);
  },
};
