// Referrals routes — referral code, history, and stats
import { Router } from 'express';
import { getReferralCode, getReferralStats, listReferralHistory, listRewardHistory } from './referrals.controller';
import { authenticate } from '../../common/middleware/jwt-auth.middleware';

export const referralsRouter = Router();

referralsRouter.use(authenticate);

referralsRouter.get('/code', getReferralCode);
referralsRouter.get('/stats', getReferralStats);
referralsRouter.get('/history', listReferralHistory);
referralsRouter.get('/rewards', listRewardHistory);
