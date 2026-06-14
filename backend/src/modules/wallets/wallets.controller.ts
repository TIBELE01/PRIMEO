// Wallet controller — solde et historique des transactions du portefeuille virtuel
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../database/prisma.service';
import { walletService } from './wallets.service';

export async function getMyWallet(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.sub;
    const { balance, currency } = await walletService.getOrCreate(userId);

    // Toutes les transactions qui affectent le portefeuille, triées par date décroissante
    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        type: { in: ['payout_to_professional', 'referral_reward', 'refund'] },
        status: 'success',
      },
      orderBy: { completedAt: 'desc' },
      take: 100,
      select: {
        id: true,
        type: true,
        amount: true,
        netAmount: true,
        fee: true,
        notes: true,
        completedAt: true,
        booking: {
          select: {
            id: true,
            startDate: true,
            endDate: true,
            property: { select: { title: true } },
          },
        },
      },
    });

    res.json({
      data: {
        balance,
        currency,
        transactions: transactions.map(t => ({
          id: t.id,
          type: t.type,
          amount: t.netAmount ?? t.amount,
          fee: t.fee ?? 0,
          notes: t.notes,
          date: t.completedAt,
          booking: t.booking
            ? {
                id: t.booking.id,
                startDate: t.booking.startDate,
                endDate: t.booking.endDate,
                propertyTitle: t.booking.property?.title ?? null,
              }
            : null,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
}
