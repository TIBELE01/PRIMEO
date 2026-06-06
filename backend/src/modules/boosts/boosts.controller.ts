// Boosts controller
import { Request, Response, NextFunction } from 'express';
import { boostsService } from './boosts.service';

export async function createBoost(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const boost = await boostsService.create(req.user!.sub, req.body);
    res.status(201).json(boost);
  } catch (err) {
    next(err);
  }
}

export async function listMyBoosts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await boostsService.listForOwner(req.user!.sub);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getBoostBalance(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const balance = await boostsService.getBalance(req.user!.sub);
    res.json(balance);
  } catch (err) {
    next(err);
  }
}
