// Wallet router — portefeuille virtuel du professionnel
import { Router } from 'express';
import { authenticate } from '../../common/middleware/jwt-auth.middleware';
import { getMyWallet } from './wallets.controller';

export const walletsRouter = Router();

walletsRouter.use(authenticate);
walletsRouter.get('/me', getMyWallet);
