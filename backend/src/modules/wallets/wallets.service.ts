// Wallet service — point d'entrée unique pour toute mutation du portefeuille virtuel.
//
// La source de vérité est la table `wallets` (modèle Wallet). Pour préserver la
// compatibilité avec le code et les réponses API qui exposent encore
// `users.walletBalance`, chaque opération met à jour les DEUX dans la même
// transaction. Aucun autre module ne doit écrire le solde directement.
import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '../../database/prisma.service';
import { HttpError } from '../../common/handlers/http-error.handler';

// Accepte aussi bien le client Prisma global qu'un client transactionnel ($transaction)
type Db = PrismaClient | Prisma.TransactionClient;

export const walletService = {
  // Garantit l'existence de la ligne wallet pour un utilisateur et renvoie son solde.
  async getOrCreate(userId: string, db: Db = prisma): Promise<{ balance: number; currency: string }> {
    const existing = await db.wallet.findUnique({ where: { userId } });
    if (existing) return { balance: existing.balance, currency: existing.currency };

    // Backfill : si l'utilisateur a un walletBalance hérité, on l'initialise avec.
    const user = await db.user.findUnique({ where: { id: userId }, select: { walletBalance: true } });
    const initial = user?.walletBalance ?? 0;
    const created = await db.wallet.create({ data: { userId, balance: initial } });
    return { balance: created.balance, currency: created.currency };
  },

  async getBalance(userId: string, db: Db = prisma): Promise<number> {
    const { balance } = await walletService.getOrCreate(userId, db);
    return balance;
  },

  // Crédite le portefeuille. À appeler à l'intérieur d'une transaction Prisma
  // lorsque l'opération doit être atomique avec d'autres écritures (récompense, remboursement).
  async credit(userId: string, amount: number, db: Db = prisma): Promise<number> {
    if (amount <= 0) throw new HttpError(400, 'Le montant à créditer doit être positif');
    await walletService.getOrCreate(userId, db);

    const wallet = await db.wallet.update({
      where: { userId },
      data: { balance: { increment: amount } },
    });
    // Maintien de la compatibilité walletBalance (lecture par d'anciens endpoints)
    await db.user.update({ where: { id: userId }, data: { walletBalance: wallet.balance } });
    return wallet.balance;
  },

  // Débite le portefeuille (déduction lors d'une réservation). Refuse un solde négatif.
  async debit(userId: string, amount: number, db: Db = prisma): Promise<number> {
    if (amount <= 0) throw new HttpError(400, 'Le montant à débiter doit être positif');
    const { balance } = await walletService.getOrCreate(userId, db);
    if (balance < amount) throw new HttpError(422, 'Solde de portefeuille insuffisant');

    const wallet = await db.wallet.update({
      where: { userId },
      data: { balance: { decrement: amount } },
    });
    await db.user.update({ where: { id: userId }, data: { walletBalance: wallet.balance } });
    return wallet.balance;
  },
};
