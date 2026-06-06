// Boosts routes — paid and free property promotion
import { Router } from 'express';
import { createBoost, listMyBoosts, getBoostBalance } from './boosts.controller';
import { authenticate } from '../../common/middleware/jwt-auth.middleware';
import { authorize } from '../../common/middleware/roles.middleware';
import { validate } from '../../common/validators/validation.middleware';
import { CreateBoostDto } from './dto/boost.dto';

export const boostsRouter = Router();

boostsRouter.use(authenticate);
boostsRouter.use(authorize('professional_hebergement', 'professional_hotel', 'professional_immobilier', 'restaurateur'));

boostsRouter.get('/balance', getBoostBalance);
boostsRouter.get('/me', listMyBoosts);
boostsRouter.post('/', validate(CreateBoostDto), createBoost);
