// Wallet router — portefeuille virtuel du professionnel
import { Router } from 'express';
import { authenticate } from '../../common/middleware/jwt-auth.middleware';
import { requireKycApproved } from '../professional/middlewares/professional.middleware';
import { getMyWallet } from './wallets.controller';
import {
  getPayoutAccount, savePayoutAccount, listMyWithdrawals, requestWithdrawal, cancelWithdrawal,
} from './withdrawals.controller';

export const walletsRouter = Router();

walletsRouter.use(authenticate);
walletsRouter.use(requireKycApproved);
walletsRouter.get('/me', getMyWallet);

// Coordonnées de versement et demandes de versement du solde
walletsRouter.get('/payout-account', getPayoutAccount);
walletsRouter.put('/payout-account', savePayoutAccount);
walletsRouter.get('/withdrawals', listMyWithdrawals);
walletsRouter.post('/withdrawals', requestWithdrawal);
walletsRouter.post('/withdrawals/:id/cancel', cancelWithdrawal);
