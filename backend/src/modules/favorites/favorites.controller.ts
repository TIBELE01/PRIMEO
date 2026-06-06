// Favorites controller
import { Request, Response, NextFunction } from 'express';
import { favoritesService } from './favorites.service';

export async function listFavorites(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await favoritesService.listForUser(req.user!.sub);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function addFavorite(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await favoritesService.add(req.user!.sub, req.params.propertyId);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function removeFavorite(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await favoritesService.remove(req.user!.sub, req.params.propertyId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
