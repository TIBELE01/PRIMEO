// Favorites routes — client saved properties
//
// IMPORTANT: all literal paths (/lists, /migrate) MUST be registered BEFORE any
// dynamic /:param routes at the same depth, otherwise Express matches "lists" or
// "migrate" as a propertyId and calls the wrong handler.
import { Router } from 'express';
import {
  listFavorites,
  addFavorite,
  removeFavorite,
  listFavoriteLists,
  createFavoriteList,
  renameFavoriteList,
  deleteFavoriteList,
  addItemToFavoriteList,
  removeItemFromFavoriteList,
  listFavoriteListItems,
  bulkSyncFavorites,
  bulkSyncFavoriteList,
} from './favorites.controller';
import { authenticate } from '../../common/middleware/jwt-auth.middleware';

export const favoritesRouter = Router();

favoritesRouter.use(authenticate);

// ── Simple favorites ────────────────────────────────────────────────────────
favoritesRouter.get('/', listFavorites);
favoritesRouter.post('/migrate', bulkSyncFavorites);

// ── Favorite Lists (literal routes before /:propertyId) ─────────────────────
favoritesRouter.get('/lists', listFavoriteLists);
favoritesRouter.post('/lists', createFavoriteList);
favoritesRouter.patch('/lists/:listId', renameFavoriteList);
favoritesRouter.delete('/lists/:listId', deleteFavoriteList);
favoritesRouter.get('/lists/:listId/items', listFavoriteListItems);
favoritesRouter.post('/lists/:listId/items', addItemToFavoriteList);
favoritesRouter.delete('/lists/:listId/items/:propertyId', removeItemFromFavoriteList);
favoritesRouter.put('/lists/:listId/sync', bulkSyncFavoriteList);

// ── Dynamic /:propertyId — must come after all literal routes at this depth ──
favoritesRouter.post('/:propertyId', addFavorite);
favoritesRouter.delete('/:propertyId', removeFavorite);
