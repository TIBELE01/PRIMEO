// Media controller — file upload and deletion
import { Request, Response, NextFunction } from 'express';
import { mediaService } from './media.service';

export async function uploadImage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file provided' });
      return;
    }
    const result = await mediaService.upload(req.file, req.body.folder ?? 'properties');
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function deleteImage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await mediaService.delete(req.params.publicId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
