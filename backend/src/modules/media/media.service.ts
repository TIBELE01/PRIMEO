// Media service — delegates to Cloudinary client
import { uploadToCloudinary, deleteFromCloudinary } from '../../common/utils/s3-client';
import { cloudinaryConfig } from '../../config/cloudinary.config';
import { HttpError } from '../../common/handlers/http-error.handler';

export const mediaService = {
  async upload(file: Express.Multer.File, folderKey: string) {
    const folder = cloudinaryConfig.folders[folderKey as keyof typeof cloudinaryConfig.folders]
      ?? cloudinaryConfig.folders.properties;

    if (!(cloudinaryConfig.allowedFormats as readonly string[]).includes(file.mimetype.split('/')[1])) {
      throw new HttpError(400, `File type not allowed: ${file.mimetype}`);
    }

    return uploadToCloudinary(file.buffer, folder, file.originalname);
  },

  async delete(publicId: string) {
    await deleteFromCloudinary(publicId);
  },
};
