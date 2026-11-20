// Wallet router — portefeuille virtuel (professionnels et clients)
import { Router, type Request, type Response, type NextFunction } from 'express';
import { authenticate } from '../../common/middleware/jwt-auth.middleware';
import { requireKycApproved } from '../professional/middlewares/professional.middleware';
import { getMyWallet } from './wallets.controller';
import {
  getPayoutAccount, savePayoutAccount, listMyWithdrawals, requestWithdrawal, cancelWithdrawal,
} from './withdrawals.controller';

export const walletsRouter = Router();

// Clients : accès direct (gains de parrainage, remboursements). Professionnels : KYC validé requis.
function requireKycForProfessionals(req: Request, res: Response, next: NextFunction): void {
  if (req.user?.role === 'client') return next();
  void requireKycApproved(req, res, next);
}

walletsRouter.use(authenticate);
walletsRouter.use(requireKycForProfessionals);
walletsRouter.get('/me', getMyWallet);

// Coordonnées de versement et demandes de versement du solde
walletsRouter.get('/payout-account', getPayoutAccount);
walletsRouter.put('/payout-account', savePayoutAccount);
walletsRouter.get('/withdrawals', listMyWithdrawals);
walletsRouter.post('/withdrawals', requestWithdrawal);
walletsRouter.post('/withdrawals/:id/cancel', cancelWithdrawal);
