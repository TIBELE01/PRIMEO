// Media routes — Cloudinary image upload/delete
import { Router } from 'express';
import { uploadImage, deleteImage } from './media.controller';
import { authenticate } from '../../common/middleware/jwt-auth.middleware';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

export const mediaRouter = Router();

mediaRouter.use(authenticate);
mediaRouter.post('/upload', upload.single('file'), uploadImage);
mediaRouter.delete('/:publicId', deleteImage);
