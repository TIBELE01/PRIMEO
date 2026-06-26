// Restaurant sub-router — mounted under /api/properties/:propertyId
// Handles time slots, menu items, special menus, promotions
import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import { restaurantService } from './restaurant.service';
import { authenticate } from '../../common/middleware/jwt-auth.middleware';
import { authorize } from '../../common/middleware/roles.middleware';
import { requireKycApproved } from '../professional/middlewares/professional.middleware';
import { HttpError } from '../../common/handlers/http-error.handler';

export const restaurantRouter = Router({ mergeParams: true }); // mergeParams to get :propertyId

const ownerOnly = [
  authenticate,
  authorize('restaurateur', 'professional_hebergement', 'professional_hotel', 'professional_immobilier', 'admin'),
  requireKycApproved, // les admins passent, les pros doivent avoir un KYC approuvé
];

// ── Time slots ────────────────────────────────────────────────────────────────

restaurantRouter.get('/time-slots', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await restaurantService.getTimeSlots(req.params.propertyId);
    res.json({ data });
  } catch (err) { next(err); }
});

restaurantRouter.post('/time-slots', ...ownerOnly, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { dayOfWeek, startTime, endTime, maxCapacity, isBlocked } = req.body;
    if (dayOfWeek === undefined || !startTime || !endTime || !maxCapacity) {
      throw new HttpError(400, 'dayOfWeek, startTime, endTime et maxCapacity sont requis');
    }
    const data = await restaurantService.createTimeSlot(
      req.params.propertyId,
      req.user!.sub,
      { dayOfWeek: Number(dayOfWeek), startTime, endTime, maxCapacity: Number(maxCapacity), isBlocked },
    );
    res.status(201).json({ data });
  } catch (err) { next(err); }
});

restaurantRouter.patch('/time-slots/:slotId', ...ownerOnly, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { maxCapacity, isBlocked } = req.body;
    const data = await restaurantService.updateTimeSlot(
      req.params.propertyId,
      req.params.slotId,
      req.user!.sub,
      {
        ...(maxCapacity !== undefined ? { maxCapacity: Number(maxCapacity) } : {}),
        ...(isBlocked !== undefined ? { isBlocked: Boolean(isBlocked) } : {}),
      },
    );
    res.json({ data });
  } catch (err) { next(err); }
});

restaurantRouter.delete('/time-slots/:slotId', ...ownerOnly, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await restaurantService.deleteTimeSlot(req.params.propertyId, req.params.slotId, req.user!.sub);
    res.json({ message: 'Créneau supprimé' });
  } catch (err) { next(err); }
});

// ── Menu items ────────────────────────────────────────────────────────────────

restaurantRouter.get('/menu', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await restaurantService.getMenuItems(req.params.propertyId);
    res.json({ data });
  } catch (err) { next(err); }
});

restaurantRouter.post('/menu', ...ownerOnly, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await restaurantService.createMenuItem(
      req.params.propertyId,
      req.user!.sub,
      req.body,
    );
    res.status(201).json({ data });
  } catch (err) { next(err); }
});

restaurantRouter.patch('/menu/:itemId', ...ownerOnly, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await restaurantService.updateMenuItem(
      req.params.propertyId,
      req.params.itemId,
      req.user!.sub,
      req.body,
    );
    res.json({ data });
  } catch (err) { next(err); }
});

restaurantRouter.delete('/menu/:itemId', ...ownerOnly, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await restaurantService.deleteMenuItem(req.params.propertyId, req.params.itemId, req.user!.sub);
    res.json({ message: 'Article supprimé' });
  } catch (err) { next(err); }
});

// ── Tables (gestion de salle) ─────────────────────────────────────────────────

restaurantRouter.get('/tables', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await restaurantService.getTables(req.params.propertyId);
    res.json({ data });
  } catch (err) { next(err); }
});

restaurantRouter.post('/tables', ...ownerOnly, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, seats, location, sortOrder } = req.body;
    if (!name || seats === undefined) throw new HttpError(400, 'name et seats sont requis');
    const data = await restaurantService.createTable(req.params.propertyId, req.user!.sub, { name, seats, location, sortOrder });
    res.status(201).json({ data });
  } catch (err) { next(err); }
});

restaurantRouter.patch('/tables/:tableId', ...ownerOnly, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await restaurantService.updateTable(req.params.propertyId, req.params.tableId, req.user!.sub, req.body);
    res.json({ data });
  } catch (err) { next(err); }
});

restaurantRouter.delete('/tables/:tableId', ...ownerOnly, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await restaurantService.deleteTable(req.params.propertyId, req.params.tableId, req.user!.sub);
    res.json({ message: 'Table supprimée' });
  } catch (err) { next(err); }
});

// ── Special menus ─────────────────────────────────────────────────────────────

restaurantRouter.get('/special-menus', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await restaurantService.getSpecialMenus(req.params.propertyId);
    res.json({ data });
  } catch (err) { next(err); }
});

restaurantRouter.post('/special-menus', ...ownerOnly, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await restaurantService.createSpecialMenu(
      req.params.propertyId,
      req.user!.sub,
      req.body,
    );
    res.status(201).json({ data });
  } catch (err) { next(err); }
});

restaurantRouter.delete('/special-menus/:menuId', ...ownerOnly, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await restaurantService.deleteSpecialMenu(req.params.propertyId, req.params.menuId, req.user!.sub);
    res.json({ message: 'Menu spécial supprimé' });
  } catch (err) { next(err); }
});

// ── Promotions ────────────────────────────────────────────────────────────────

restaurantRouter.get('/promotions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await restaurantService.getPromotions(req.params.propertyId);
    res.json({ data });
  } catch (err) { next(err); }
});

restaurantRouter.post('/promotions', ...ownerOnly, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await restaurantService.createPromotion(
      req.params.propertyId,
      req.user!.sub,
      req.body,
    );
    res.status(201).json({ data });
  } catch (err) { next(err); }
});

restaurantRouter.patch('/promotions/:promoId', ...ownerOnly, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await restaurantService.updatePromotion(
      req.params.propertyId,
      req.params.promoId,
      req.user!.sub,
      req.body,
    );
    res.json({ data });
  } catch (err) { next(err); }
});

restaurantRouter.delete('/promotions/:promoId', ...ownerOnly, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await restaurantService.deletePromotion(req.params.propertyId, req.params.promoId, req.user!.sub);
    res.json({ message: 'Promotion supprimée' });
  } catch (err) { next(err); }
});
