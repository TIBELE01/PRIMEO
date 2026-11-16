// Versements aux professionnels. Le portefeuille Primeo est VIRTUEL : il ne détient pas de fonds.
// Le professionnel renseigne ses coordonnées (Mobile Money ou banque) puis demande le versement
// de son solde ; un administrateur effectue le virement et marque la demande comme payée.
import { z } from 'zod';
import { prisma } from '../../database/prisma.service';
import { HttpError } from '../../common/handlers/http-error.handler';
import { walletService } from './wallets.service';

export const PAYOUT_METHODS = ['orange_money', 'mtn_money', 'wave', 'moov_money', 'bank'] as const;
export const MIN_WITHDRAWAL_FCFA = 1000;

export const PayoutAccountDto = z.object({
  method: z.enum(PAYOUT_METHODS),
  holderName: z.string().trim().min(2, 'Nom du titulaire requis').max(120),
  accountNumber: z.string().trim().min(6, 'Numéro de compte invalide').max(60),
  bankName: z.string().trim().max(120).optional(),
}).refine((v) => v.method !== 'bank' || !!v.bankName, { message: 'Nom de la banque requis', path: ['bankName'] })
  .refine((v) => v.method === 'bank' || /^[+\d][\d\s.-]{7,19}$/.test(v.accountNumber), {
    message: 'Numéro Mobile Money invalide', path: ['accountNumber'],
  });
export type PayoutAccountInput = z.infer<typeof PayoutAccountDto>;

export const WithdrawalRequestDto = z.object({ amount: z.number().int().positive().optional() });

export const withdrawalsService = {
  getAccount(userId: string) {
    return prisma.payoutAccount.findUnique({ where: { userId } });
  },

  saveAccount(userId: string, input: PayoutAccountInput) {
    const data = {
      method: input.method,
      holderName: input.holderName,
      accountNumber: input.accountNumber,
      bankName: input.method === 'bank' ? input.bankName ?? null : null,
    };
    return prisma.payoutAccount.upsert({ where: { userId }, create: { userId, ...data }, update: data });
  },

  listMine(userId: string) {
    return prisma.withdrawalRequest.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 50 });
  },

  /** Crée une demande de versement et retire le montant du portefeuille (atomique). Sans montant : tout le solde. */
  async request(userId: string, amount?: number) {
    const account = await prisma.payoutAccount.findUnique({ where: { userId } });
    if (!account) throw new HttpError(400, 'Renseignez d’abord vos coordonnées de versement.');

    return prisma.$transaction(async (tx) => {
      const balance = await walletService.getBalance(userId, tx);
      const value = amount ?? balance;
      if (value < MIN_WITHDRAWAL_FCFA) {
        throw new HttpError(400, `Le montant minimum d’un versement est de ${MIN_WITHDRAWAL_FCFA} FCFA.`);
      }
      if (value > balance) throw new HttpError(422, 'Solde de portefeuille insuffisant');
      const pending = await tx.withdrawalRequest.count({ where: { userId, status: 'pending' } });
      if (pending >= 3) throw new HttpError(409, 'Vous avez déjà 3 demandes en attente de traitement.');

      await walletService.debit(userId, value, tx);
      return tx.withdrawalRequest.create({
        data: {
          userId, amount: value, status: 'pending',
          method: account.method, holderName: account.holderName,
          accountNumber: account.accountNumber, bankName: account.bankName,
        },
      });
    });
  },

  /** Le professionnel annule une demande encore en attente : le montant est recrédité. */
  async cancel(userId: string, id: string) {
    return prisma.$transaction(async (tx) => {
      const r = await tx.withdrawalRequest.findUnique({ where: { id } });
      if (!r || r.userId !== userId) throw new HttpError(404, 'Demande introuvable');
      const upd = await tx.withdrawalRequest.updateMany({
        where: { id, status: 'pending' }, data: { status: 'cancelled', processedAt: new Date() },
      });
      if (upd.count !== 1) throw new HttpError(400, 'Seule une demande en attente peut être annulée');
      await walletService.credit(userId, r.amount, tx);
      return { id, status: 'cancelled' };
    });
  },

  // ── Administration ────────────────────────────────────────────────────────
  listAll(status?: string) {
    return prisma.withdrawalRequest.findMany({
      where: status ? { status } : undefined,
      orderBy: [{ createdAt: 'desc' }],
      take: 200,
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } } },
    });
  },

  async markPaid(adminId: string, id: string, reference?: string) {
    const upd = await prisma.withdrawalRequest.updateMany({
      where: { id, status: 'pending' },
      data: { status: 'paid', reference: reference?.trim() || null, processedById: adminId, processedAt: new Date() },
    });
    if (upd.count !== 1) throw new HttpError(400, 'Seule une demande en attente peut être marquée comme payée');
    return { id, status: 'paid' };
  },

  async reject(adminId: string, id: string, reason: string) {
    if (!reason?.trim()) throw new HttpError(400, 'Un motif de refus est requis');
    return prisma.$transaction(async (tx) => {
      const r = await tx.withdrawalRequest.findUnique({ where: { id } });
      if (!r) throw new HttpError(404, 'Demande introuvable');
      const upd = await tx.withdrawalRequest.updateMany({
        where: { id, status: 'pending' },
        data: { status: 'rejected', rejectionReason: reason.trim(), processedById: adminId, processedAt: new Date() },
      });
      if (upd.count !== 1) throw new HttpError(400, 'Seule une demande en attente peut être refusée');
      await walletService.credit(r.userId, r.amount, tx);
      return { id, status: 'rejected' };
    });
  },
};
