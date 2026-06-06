// Referrals service — referral code, history, reward tracking, and automatic distribution
import { prisma } from '../../database/prisma.service';
import { HttpError } from '../../common/handlers/http-error.handler';
import { env } from '../../config/env.config';
import { notificationsService } from '../notifications/notifications.service';
import { logger } from '../../common/utils/logger';

const REFERRAL_REWARD_FCFA = 2_000;

export const referralsService = {
  async getCode(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true },
    });
    if (!user) throw new HttpError(404, 'Utilisateur introuvable');

    const baseUrl = env.FRONTEND_URL ?? env.BACKEND_URL;
    return {
      code: user.referralCode,
      referralUrl: `${baseUrl}/register?ref=${user.referralCode}`,
    };
  },

  async getStats(userId: string) {
    const referrals = await prisma.referral.findMany({
      where: { referrerId: userId },
    });
    const rewarded = referrals.filter((r) => r.status === 'rewarded');
    const totalRewards = rewarded.reduce((sum, r) => sum + r.rewardAmount, 0);

    return {
      totalReferrals: referrals.length,
      rewardedCount: rewarded.length,
      pendingCount: referrals.filter((r) => r.status === 'pending').length,
      totalRewardsFcfa: totalRewards,
    };
  },

  async listHistory(userId: string) {
    const referrals = await prisma.referral.findMany({
      where: { referrerId: userId },
      include: {
        referee: {
          select: { firstName: true, lastName: true, createdAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return referrals.map((r) => ({
      id: r.id,
      status: r.status,
      rewardAmount: r.rewardAmount,
      rewardDate: r.rewardDate,
      inscriptionDate: r.inscriptionDate,
      createdAt: r.createdAt,
      refereeName: r.referee
        ? `${r.referee.firstName} ${r.referee.lastName}`.trim()
        : null,
      refereeJoinedAt: r.referee?.createdAt ?? null,
    }));
  },

  // Returns only rewarded referrals with wallet credit details for the reward history tab
  async listRewardHistory(userId: string) {
    const rewards = await prisma.transaction.findMany({
      where: { userId, type: 'referral_reward', status: 'success' },
      orderBy: { completedAt: 'desc' },
    });

    return rewards.map((t) => ({
      id: t.id,
      amount: t.amount,
      notes: t.notes,
      earnedAt: t.completedAt,
    }));
  },

  // Triggered from bookings.service or the reconciliation cron job.
  // Idempotent: returns early if the reward was already distributed.
  async triggerReward(refereeId: string): Promise<void> {
    const referral = await prisma.referral.findFirst({
      where: { refereeId, status: 'pending' },
      include: {
        referrer: { select: { id: true, firstName: true, lastName: true } },
        referee:  { select: { firstName: true, lastName: true } },
      },
    });

    if (!referral) return; // already rewarded or no referral for this user

    await prisma.$transaction([
      prisma.referral.update({
        where: { id: referral.id },
        data: { status: 'rewarded', rewardDate: new Date() },
      }),
      prisma.user.update({
        where: { id: referral.referrerId },
        data: { walletBalance: { increment: REFERRAL_REWARD_FCFA } },
      }),
      prisma.transaction.create({
        data: {
          userId: referral.referrerId,
          type: 'referral_reward',
          amount: REFERRAL_REWARD_FCFA,
          fee: 0,
          netAmount: REFERRAL_REWARD_FCFA,
          status: 'success',
          notes: `Récompense parrainage — filleul ${refereeId}`,
          completedAt: new Date(),
        },
      }),
    ]);

    // Notify the referrer — fire-and-forget, never block the transaction
    const refereeName = referral.referee
      ? `${referral.referee.firstName} ${referral.referee.lastName}`.trim()
      : 'Votre filleul';

    notificationsService.notify({
      type: 'referral_reward',
      recipientId: referral.referrerId,
      data: {
        refereeName,
        rewardAmount: REFERRAL_REWARD_FCFA,
      },
    }).catch((err) => logger.warn(`Referral reward notification failed for referrer ${referral.referrerId}`, err));

    logger.info(`Referral reward distributed: referrer=${referral.referrerId} referee=${refereeId} amount=${REFERRAL_REWARD_FCFA}`);
  },

  // Reconciliation: returns the count of pending referrals that were newly rewarded.
  // Called by the daily cron job to catch any rewards that were missed by the inline trigger.
  async reconcilePendingRewards(): Promise<{ rewarded: number; errors: number }> {
    // Find refereeIds that have at least one completed booking
    const refereesWithBookings = await prisma.booking.findMany({
      where: { status: 'completed' },
      select: { clientId: true },
      distinct: ['clientId'],
    });
    const refereeIds = refereesWithBookings.map((b) => b.clientId);

    if (!refereeIds.length) return { rewarded: 0, errors: 0 };

    const pendingReferrals = await prisma.referral.findMany({
      where: {
        status: 'pending',
        refereeId: { in: refereeIds },
      },
      select: { refereeId: true },
    });

    let rewarded = 0;
    let errors = 0;

    for (const ref of pendingReferrals) {
      if (!ref.refereeId) continue;
      try {
        await referralsService.triggerReward(ref.refereeId);
        rewarded++;
      } catch (err) {
        errors++;
        logger.error(`Referral reconciliation failed for referee ${ref.refereeId}`, err);
      }
    }

    return { rewarded, errors };
  },
};
