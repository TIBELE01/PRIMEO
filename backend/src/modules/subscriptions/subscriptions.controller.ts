// Subscriptions controller
import { Request, Response, NextFunction } from 'express';
import { subscriptionsService } from './subscriptions.service';

// Retourne les formules adaptées au type de compte de l'utilisateur authentifié
export async function listPlans(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as any).user?.sub as string | undefined;
    let accountType: string | undefined;
    if (userId) {
      const { prisma } = await import('../../database/prisma.service');
      const u = await prisma.user.findUnique({ where: { id: userId }, select: { accountType: true } });
      accountType = u?.accountType ?? undefined;
    }
    const plans = await subscriptionsService.listPlans(accountType);
    res.json(plans);
  } catch (err) {
    next(err);
  }
}

export async function getMySubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const sub = await subscriptionsService.getForUser(req.user!.sub);
    res.json(sub);
  } catch (err) {
    next(err);
  }
}

export async function upgradePlan(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await subscriptionsService.upgrade(req.user!.sub, req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function cancelSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await subscriptionsService.cancel(req.user!.sub);
    res.json({ message: 'Abonnement annulé' });
  } catch (err) {
    next(err);
  }
}

export async function listInvoices(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = parseInt((req.query['page'] as string) ?? '1');
    const limit = parseInt((req.query['limit'] as string) ?? '20');
    const result = await subscriptionsService.listInvoices(req.user!.sub, page, limit);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// ── Publications supplémentaires ────────────────────────────────────────────

export async function getSlots(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json({ data: await subscriptionsService.getSlotsInfo(req.user!.sub) });
  } catch (err) {
    next(err);
  }
}

export async function purchaseSlots(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const quantity = Number(req.body?.quantity ?? 1);
    res.json({ data: await subscriptionsService.purchaseSlots(req.user!.sub, quantity) });
  } catch (err) {
    next(err);
  }
}

export async function getSlotTransactionStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await subscriptionsService.getSlotTransactionStatus(req.params.txId!, req.user!.sub);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function cancelSlots(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const quantity = Number(req.body?.quantity ?? 1);
    res.json({ data: await subscriptionsService.cancelSlots(req.user!.sub, quantity) });
  } catch (err) {
    next(err);
  }
}
