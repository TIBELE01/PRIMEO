// Reviews controller
import { Request, Response, NextFunction } from 'express';
import { reviewsService } from './reviews.service';

export async function createReview(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const review = await reviewsService.create(req.user!.sub, req.body);
    res.status(201).json(review);
  } catch (err) {
    next(err);
  }
}

export async function updateReview(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const review = await reviewsService.update(req.params['id']!, req.user!.sub, req.body);
    res.json(review);
  } catch (err) {
    next(err);
  }
}

export async function deleteReview(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await reviewsService.delete(req.params['id']!, req.user!.sub);
    res.json({ message: 'Avis supprimé' });
  } catch (err) {
    next(err);
  }
}

export async function getPropertyReviews(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await reviewsService.getForProperty(req.params['id']!, req.query as never);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function listMyReviews(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await reviewsService.listMine(req.user!.sub, req.query as never);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function replyToReview(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const review = await reviewsService.addOwnerReply(req.params['id']!, req.user!.sub, req.body.reply);
    res.json(review);
  } catch (err) {
    next(err);
  }
}

export async function uploadReviewMedia(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.file) { res.status(400).json({ message: 'Aucun fichier' }); return; }
    const result = await reviewsService.uploadMedia(req.params['id']!, req.user!.sub, req.file);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function deleteReviewMedia(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await reviewsService.deleteMedia(req.params['mediaId']!, req.user!.sub);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
