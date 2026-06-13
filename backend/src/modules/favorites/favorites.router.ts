// Favorites routes — client saved properties
import { Router } from 'express';
import {
  listFavorites,
  addFavorite,
  removeFavorite,
  listFavoriteLists,
  createFavoriteList,
  deleteFavoriteList,
  addItemToFavoriteList,
  removeItemFromFavoriteList,
  listFavoriteListItems,
  bulkSyncFavoriteList,
} from './favorites.controller';
import { authenticate } from '../../common/middleware/jwt-auth.middleware';

export const favoritesRouter = Router();

favoritesRouter.use(authenticate);

favoritesRouter.get('/', listFavorites);
favoritesRouter.post('/:propertyId', addFavorite);
favoritesRouter.delete('/:propertyId', removeFavorite);

// ── Favorite Lists ──────────────────────────────────────────────────────────
favoritesRouter.get('/lists', listFavoriteLists);
favoritesRouter.post('/lists', createFavoriteList);
favoritesRouter.delete('/lists/:listId', deleteFavoriteList);
favoritesRouter.get('/lists/:listId/items', listFavoriteListItems);
favoritesRouter.post('/lists/:listId/items', addItemToFavoriteList);
favoritesRouter.delete('/lists/:listId/items/:propertyId', removeItemFromFavoriteList);
favoritesRouter.put('/lists/:listId/sync', bulkSyncFavoriteList);
