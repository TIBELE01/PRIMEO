// Favorites routes — client saved properties
import { Router } from 'express';
import { listFavorites, addFavorite, removeFavorite } from './favorites.controller';
import { authenticate } from '../../common/middleware/jwt-auth.middleware';

export const favoritesRouter = Router();

favoritesRouter.use(authenticate);

favoritesRouter.get('/', listFavorites);
favoritesRouter.post('/:propertyId', addFavorite);
favoritesRouter.delete('/:propertyId', removeFavorite);
