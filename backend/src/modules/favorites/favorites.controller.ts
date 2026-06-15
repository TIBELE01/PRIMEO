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

export async function listFavoriteLists(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json({ data: await favoritesService.listLists(req.user!.sub) }); } catch (err) { next(err); }
}

export async function createFavoriteList(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const list = await favoritesService.createList(req.user!.sub, req.body.name ?? '');
    res.status(201).json({ data: list });
  } catch (err) { next(err); }
}

export async function deleteFavoriteList(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await favoritesService.deleteList(req.params.listId!, req.user!.sub);
    res.status(204).send();
  } catch (err) { next(err); }
}

export async function addItemToFavoriteList(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const item = await favoritesService.addItemToList(req.params.listId!, req.body.propertyId, req.user!.sub);
    res.status(201).json({ data: item });
  } catch (err) { next(err); }
}

export async function removeItemFromFavoriteList(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await favoritesService.removeItemFromList(req.params.listId!, req.params.propertyId!, req.user!.sub);
    res.status(204).send();
  } catch (err) { next(err); }
}

export async function listFavoriteListItems(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json({ data: await favoritesService.listItemsInList(req.params.listId!, req.user!.sub) }); } catch (err) { next(err); }
}

export async function renameFavoriteList(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const list = await favoritesService.renameList(req.params.listId!, req.user!.sub, req.body.name ?? '');
    res.json({ data: list });
  } catch (err) { next(err); }
}

export async function bulkSyncFavorites(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await favoritesService.bulkSyncFavorites(req.user!.sub, req.body.propertyIds ?? []);
    res.json({ data: result });
  } catch (err) { next(err); }
}

export async function bulkSyncFavoriteList(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await favoritesService.bulkSyncList(req.params.listId!, req.body.propertyIds ?? [], req.user!.sub);
    res.json({ data: result });
  } catch (err) { next(err); }
}
