// Promos routes — discount codes
import { Router } from 'express';
import { validatePromo, createPromo, listPromos } from './promos.controller';
import { authenticate } from '../../common/middleware/jwt-auth.middleware';
import { authorize } from '../../common/middleware/roles.middleware';
import { validate } from '../../common/validators/validation.middleware';
import { ValidatePromoDto, CreatePromoDto } from './dto/promo.dto';

export const promosRouter = Router();

promosRouter.use(authenticate);

// Client: validate a promo code
promosRouter.post('/validate', validate(ValidatePromoDto), validatePromo);

// Admin: manage promo codes
promosRouter.get('/', authorize('admin'), listPromos);
promosRouter.post('/', authorize('admin'), validate(CreatePromoDto), createPromo);
