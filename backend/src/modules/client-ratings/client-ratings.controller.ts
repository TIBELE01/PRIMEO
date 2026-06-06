// Client ratings controller
import { Request, Response, NextFunction } from 'express';
import { clientRatingsService } from './client-ratings.service';

export async function createClientRating(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rating = await clientRatingsService.create(req.user!.sub, req.body);
    res.status(201).json(rating);
  } catch (err) {
    next(err);
  }
}

export async function listGivenRatings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await clientRatingsService.listGiven(req.user!.sub, req.query as never);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getClientAggregate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await clientRatingsService.getClientAggregate(req.params['clientId']!);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function checkCanRate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await clientRatingsService.canRate(req.user!.sub, req.params['bookingId']!);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function listReceivedRatings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await clientRatingsService.listReceived(req.user!.sub, req.query as never);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function reportClientRating(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await clientRatingsService.reportRating(req.params['id']!, req.user!.sub, req.body.reason);
    res.json({ message: 'Signalement enregistré. Un administrateur va examiner cette évaluation.' });
  } catch (err) {
    next(err);
  }
}
