// Referrals service — code de parrainage, ajout post-inscription, historique,
// et versement automatique des récompenses sur le portefeuille virtuel (table wallets).
//
// Conditions de versement (créditées au PARRAIN) :
//   • filleul client       → 250 FCFA  après sa première réservation CONFIRMÉE
//   • filleul professionnel → 1000 FCFA après la validation de son KYC
//
// Le versement est idempotent : une fois le parrainage passé en `rewarded`, tout
// nouvel appel est sans effet (la recherche ne porte que sur les `pending`).
import { prisma } from '../../database/prisma.service';
import { HttpError } from '../../common/handlers/http-error.handler';
import { env } from '../../config/env.config';
import { notificationsService } from '../notifications/notifications.service';
import { walletService } from '../wallets/wallets.service';
import { logger } from '../../common/utils/logger';

export const REFERRAL_REWARD_CLIENT_FCFA = 250;
export const REFERRAL_REWARD_PRO_FCFA = 1_000;

// Montant de récompense selon le type de compte du filleul
function rewardForAccountType(accountType: string): number {
  return accountType === 'client' ? REFERRAL_REWARD_CLIENT_FCFA : REFERRAL_REWARD_PRO_FCFA;
}

export const referralsService = {
  async getCode(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true },
    });
    if (!user) throw new HttpError(404, 'Utilisateur introuvable');

    // L'utilisateur a-t-il déjà été parrainé ? (interdit un second ajout de code)
    const existingReferral = await prisma.referral.findUnique({ where: { refereeId: userId } });

    const baseUrl = env.FRONTEND_URL ?? env.BACKEND_URL;
    return {
      code: user.referralCode,
      referralUrl: `${baseUrl}/register?ref=${user.referralCode}`,
      hasReferrer: Boolean(existingReferral),
      canApplyCode: !existingReferral,
      rewards: {
        client: REFERRAL_REWARD_CLIENT_FCFA,
        professional: REFERRAL_REWARD_PRO_FCFA,
      },
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
          select: { firstName: true, lastName: true, accountType: true, createdAt: true },
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
      refereeType: r.referee?.accountType ?? null,
      refereeJoinedAt: r.referee?.createdAt ?? null,
    }));
  },

  // Renvoie uniquement les récompenses versées, avec le détail du crédit portefeuille.
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

  // Ajout d'un code de parrainage APRÈS l'inscription (un seul ajout possible).
  async applyCode(userId: string, rawCode: string) {
    const code = rawCode?.trim();
    if (!code) throw new HttpError(400, 'Code de parrainage requis');

    // Un seul parrainage reçu par utilisateur (refereeId @unique le garantit aussi en base)
    const already = await prisma.referral.findUnique({ where: { refereeId: userId } });
    if (already) throw new HttpError(409, 'Vous avez déjà renseigné un code de parrainage');

    const referrer = await prisma.user.findFirst({ where: { referralCode: code } });
    if (!referrer) throw new HttpError(404, 'Code de parrainage invalide');
    if (referrer.id === userId) throw new HttpError(400, 'Vous ne pouvez pas utiliser votre propre code');

    await prisma.referral.create({
      data: {
        referralCode: code,
        referrerId: referrer.id,
        refereeId: userId,
        status: 'pending',
        inscriptionDate: new Date(),
      },
    });

    // Si les conditions de récompense sont déjà remplies (ex. le pro a déjà un KYC
    // approuvé, ou le client a déjà une réservation confirmée), on verse immédiatement.
    await referralsService.triggerReward(userId);

    logger.info(`Code de parrainage appliqué post-inscription: referee=${userId} referrer=${referrer.id}`);
    return { message: 'Code de parrainage enregistré avec succès' };
  },

  // Vérifie si le filleul remplit la condition de versement selon son type de compte.
  async _isRewardConditionMet(refereeId: string, accountType: string): Promise<boolean> {
    if (accountType === 'client') {
      const confirmed = await prisma.booking.count({
        where: { clientId: refereeId, status: { in: ['confirmed', 'completed'] } },
      });
      return confirmed > 0;
    }
    // Professionnels : KYC approuvé
    const profile = await prisma.professionalProfile.findUnique({
      where: { userId: refereeId },
      select: { verificationStatus: true },
    });
    return profile?.verificationStatus === 'approved';
  },

  // Déclenché à la confirmation d'une réservation (filleul client) ou à l'approbation
  // KYC (filleul pro). Idempotent : sans effet si déjà récompensé ou condition non remplie.
  async triggerReward(refereeId: string): Promise<void> {
    const referral = await prisma.referral.findFirst({
      where: { refereeId, status: 'pending' },
      include: {
        referrer: { select: { id: true } },
        referee: { select: { firstName: true, lastName: true, accountType: true } },
      },
    });

    if (!referral || !referral.referee) return; // déjà récompensé ou aucun parrainage

    const accountType = referral.referee.accountType;
    const conditionMet = await referralsService._isRewardConditionMet(refereeId, accountType);
    if (!conditionMet) return; // conditions de versement pas encore remplies

    const rewardAmount = rewardForAccountType(accountType);

    await prisma.$transaction(async (tx) => {
      await tx.referral.update({
        where: { id: referral.id },
        data: { status: 'rewarded', rewardDate: new Date(), rewardAmount },
      });

      // Crédit du portefeuille virtuel (table wallets) — source de vérité du solde
      await walletService.credit(referral.referrerId, rewardAmount, tx);

      await tx.transaction.create({
        data: {
          userId: referral.referrerId,
          type: 'referral_reward',
          amount: rewardAmount,
          fee: 0,
          netAmount: rewardAmount,
          status: 'success',
          notes: `Récompense parrainage — filleul ${refereeId}`,
          completedAt: new Date(),
        },
      });
    });

    // Notification au parrain — best-effort, ne bloque jamais la transaction
    const refereeName = `${referral.referee.firstName} ${referral.referee.lastName}`.trim() || 'Votre filleul';

    notificationsService.notify({
      type: 'referral_reward',
      recipientId: referral.referrerId,
      data: { refereeName, rewardAmount },
    }).catch((err) => logger.warn(`Referral reward notification failed for referrer ${referral.referrerId}`, err));

    logger.info(`Referral reward distributed: referrer=${referral.referrerId} referee=${refereeId} type=${accountType} amount=${rewardAmount}`);
  },

  // Réconciliation (cron) : rattrape les récompenses manquées par les déclencheurs inline.
  // Couvre les deux conditions : filleuls clients avec réservation confirmée/terminée,
  // et filleuls professionnels avec KYC approuvé.
  async reconcilePendingRewards(): Promise<{ rewarded: number; errors: number }> {
    const pendingReferrals = await prisma.referral.findMany({
      where: { status: 'pending', refereeId: { not: null } },
      select: { refereeId: true },
    });

    let rewarded = 0;
    let errors = 0;

    for (const ref of pendingReferrals) {
      if (!ref.refereeId) continue;
      try {
        const before = await prisma.referral.findFirst({
          where: { refereeId: ref.refereeId, status: 'pending' },
          select: { id: true },
        });
        await referralsService.triggerReward(ref.refereeId);
        // Compte comme « versé » si le parrainage n'est plus pending
        if (before) {
          const after = await prisma.referral.findUnique({
            where: { id: before.id },
            select: { status: true },
          });
          if (after?.status === 'rewarded') rewarded++;
        }
      } catch (err) {
        errors++;
        logger.error(`Referral reconciliation failed for referee ${ref.refereeId}`, err);
      }
    }

    return { rewarded, errors };
  },
};
