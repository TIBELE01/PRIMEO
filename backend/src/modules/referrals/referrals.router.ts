// Referrals routes — code de parrainage, historique, stats, ajout de code
import { Router } from 'express';
import { z } from 'zod';
import {
  getReferralCode,
  getReferralStats,
  listReferralHistory,
  listRewardHistory,
  applyReferralCode,
} from './referrals.controller';
import { authenticate } from '../../common/middleware/jwt-auth.middleware';
import { validate } from '../../common/validators/validation.middleware';

export const referralsRouter = Router();

const ApplyReferralDto = z.object({
  code: z.string().min(1, 'Code de parrainage requis').max(100).trim(),
});

referralsRouter.use(authenticate);

referralsRouter.get('/code', getReferralCode);
referralsRouter.get('/stats', getReferralStats);
referralsRouter.get('/history', listReferralHistory);
referralsRouter.get('/rewards', listRewardHistory);
referralsRouter.post('/apply', validate(ApplyReferralDto), applyReferralCode);
