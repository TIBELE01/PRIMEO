// Controller des reversements — historique et synthèse pour le professionnel.
import type { Request, Response, NextFunction } from 'express';
import { payoutsService } from './payouts.service';

export async function listMyPayouts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Math.max(1, parseInt(String(req.query['page'] ?? '1'), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query['limit'] ?? '20'), 10) || 20));
    const result = await payoutsService.listForProfessional(req.user!.sub, page, limit);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getMyPayoutSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const summary = await payoutsService.getSummary(req.user!.sub);
    res.json({ data: summary });
  } catch (err) {
    next(err);
  }
}
