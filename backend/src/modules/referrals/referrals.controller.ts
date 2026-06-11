// Referrals controller
import { Request, Response, NextFunction } from 'express';
import { referralsService } from './referrals.service';

export async function getReferralCode(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await referralsService.getCode(req.user!.sub);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getReferralStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await referralsService.getStats(req.user!.sub);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function listReferralHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const history = await referralsService.listHistory(req.user!.sub);
    res.json(history);
  } catch (err) {
    next(err);
  }
}

export async function listRewardHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rewards = await referralsService.listRewardHistory(req.user!.sub);
    res.json(rewards);
  } catch (err) {
    next(err);
  }
}

export async function applyReferralCode(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await referralsService.applyCode(req.user!.sub, req.body?.code);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
