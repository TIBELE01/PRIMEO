// Currencies controller — indicative exchange rates
import { Request, Response, NextFunction } from 'express';
import { currenciesService } from './currencies.service';

export async function getRates(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await currenciesService.getRates());
  } catch (err) {
    next(err);
  }
}
