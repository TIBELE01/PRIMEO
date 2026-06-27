// Routes restaurant « auto-résolues » : un compte = un restaurant, donc l'ID du
// restaurant est déduit de l'utilisateur connecté plutôt que passé dans l'URL.
//   GET    /api/restaurant            -> la fiche du restaurant
//   *      /api/restaurant/menu …     -> délégué au routeur restaurant (menu, time-slots,
//                                         tables, special-menus, promotions)
import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../common/middleware/jwt-auth.middleware';
import { HttpError } from '../../common/handlers/http-error.handler';
import { propertiesService } from '../properties/properties.service';
import { restaurantService } from './restaurant.service';
import { restaurantRouter } from './restaurant.router';

interface ReqWithResto extends Request {
  _restoId?: string;
  _resto?: unknown;
}

export const restaurantMeRouter = Router();

restaurantMeRouter.use(authenticate);

// Résout le restaurant unique du compte connecté.
restaurantMeRouter.use(async (req: ReqWithResto, _res: Response, next: NextFunction): Promise<void> => {
  try {
    if (req.user!.role !== 'restaurateur') {
      throw new HttpError(403, 'Réservé aux comptes professionnels de type restaurant.');
    }
    const resto = (await propertiesService.ensureRestaurant(req.user!.sub)) as { id: string };
    req._restoId = resto.id;
    req._resto = resto;
    next();
  } catch (err) {
    next(err);
  }
});

// GET /api/restaurant -> la fiche du restaurant du compte connecté
restaurantMeRouter.get('/', (req: ReqWithResto, res: Response) => {
  res.json({ data: req._resto });
});

// PATCH /api/restaurant -> configuration (ex: activation réservation de tables)
restaurantMeRouter.patch('/', async (req: ReqWithResto, res: Response, next: NextFunction): Promise<void> => {
  try {
    const updated = await restaurantService.updateSettings(req._restoId!, req.user!.sub, req.body);
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

// Injecte l'ID résolu comme segment d'URL : le sous-routeur (mergeParams) le
// capte alors comme :propertyId — les handlers existants restent inchangés.
restaurantMeRouter.use((req: ReqWithResto, _res: Response, next: NextFunction) => {
  req.url = `/${req._restoId}${req.url}`;
  next();
});
restaurantMeRouter.use('/:propertyId', restaurantRouter);
