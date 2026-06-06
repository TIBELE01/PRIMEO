// Food orders router — commandes de nourriture
import { Router, Request, Response, NextFunction } from 'express';
import { foodOrdersService } from './food-orders.service';
import { authenticate } from '../../common/middleware/jwt-auth.middleware';
import { authorize } from '../../common/middleware/roles.middleware';
import { HttpError } from '../../common/handlers/http-error.handler';
import { FoodOrderDeliveryType, FoodOrderStatus } from '@prisma/client';

export const foodOrdersRouter = Router();

const authClient        = [authenticate, authorize('client')];
const authRestaurateur  = [authenticate, authorize('restaurateur', 'admin')];
const authAny           = [authenticate];

// ── Client : passer une commande ──────────────────────────────────────────────

foodOrdersRouter.post('/', ...authClient, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { propertyId, items, deliveryType, deliveryAddress, specialInstructions } = req.body;
    if (!propertyId) throw new HttpError(400, 'propertyId est requis');
    if (!items || !Array.isArray(items)) throw new HttpError(400, 'items doit être un tableau');
    const validDeliveryTypes: FoodOrderDeliveryType[] = ['dine_in', 'takeaway', 'delivery'];
    const dt: FoodOrderDeliveryType = validDeliveryTypes.includes(deliveryType) ? deliveryType : 'dine_in';

    const order = await foodOrdersService.createOrder((req as any).user.id, {
      propertyId, items, deliveryType: dt, deliveryAddress, specialInstructions,
    });
    res.status(201).json({ data: order });
  } catch (err) { next(err); }
});

// ── Client : mes commandes ────────────────────────────────────────────────────

foodOrdersRouter.get('/mine', ...authAny, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, propertyId } = req.query as Record<string, string>;
    const orders = await foodOrdersService.getClientOrders((req as any).user.id, { status, propertyId });
    res.json({ data: orders });
  } catch (err) { next(err); }
});

// ── Client : annuler une commande ─────────────────────────────────────────────

foodOrdersRouter.post('/:orderId/cancel', ...authClient, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reason } = req.body;
    const order = await foodOrdersService.cancelOrder(req.params.orderId, (req as any).user.id, reason);
    res.json({ data: order });
  } catch (err) { next(err); }
});

// ── Restaurant : lister les commandes du restaurant ───────────────────────────

foodOrdersRouter.get('/restaurant/:propertyId', ...authRestaurateur, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.query as Record<string, string>;
    const orders = await foodOrdersService.getRestaurantOrders(
      (req as any).user.id, req.params.propertyId, { status },
    );
    res.json({ data: orders });
  } catch (err) { next(err); }
});

// ── Restaurant : mettre à jour le statut ──────────────────────────────────────

foodOrdersRouter.patch('/:orderId/status', ...authRestaurateur, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, estimatedMinutes } = req.body;
    const validStatuses: FoodOrderStatus[] = ['confirmed', 'preparing', 'ready', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      throw new HttpError(400, `Statut invalide. Valeurs attendues : ${validStatuses.join(', ')}`);
    }
    const order = await foodOrdersService.updateOrderStatus(
      req.params.orderId,
      (req as any).user.id,
      status as FoodOrderStatus,
      estimatedMinutes !== undefined ? Number(estimatedMinutes) : undefined,
    );
    res.json({ data: order });
  } catch (err) { next(err); }
});

// ── Commun : détail d'une commande (client ou restaurant) ─────────────────────

foodOrdersRouter.get('/:orderId', ...authAny, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const order = await foodOrdersService.getOrderById(req.params.orderId, (req as any).user.id);
    res.json({ data: order });
  } catch (err) { next(err); }
});
