// Wallet router — portefeuille virtuel du professionnel
import { Router } from 'express';
import { authenticate } from '../../common/middleware/jwt-auth.middleware';
import { requireKycApproved } from '../professional/middlewares/professional.middleware';
import { getMyWallet } from './wallets.controller';

export const walletsRouter = Router();

walletsRouter.use(authenticate);
walletsRouter.use(requireKycApproved);
walletsRouter.get('/me', getMyWallet);
