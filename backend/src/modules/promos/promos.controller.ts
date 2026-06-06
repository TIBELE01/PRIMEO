// Promos controller
import { Request, Response, NextFunction } from 'express';
import { promosService } from './promos.service';

export async function validatePromo(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await promosService.validate(req.body.code);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function createPromo(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const promo = await promosService.create(req.body);
    res.status(201).json(promo);
  } catch (err) {
    next(err);
  }
}

export async function listPromos(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const promos = await promosService.list();
    res.json(promos);
  } catch (err) {
    next(err);
  }
}
