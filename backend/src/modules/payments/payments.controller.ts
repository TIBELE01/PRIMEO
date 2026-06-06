// Payments controller
import { Request, Response, NextFunction } from 'express';
import { paymentsService } from './payments.service';

export async function initiatePayment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await paymentsService.initiate(req.user!.sub, req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getPaymentStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await paymentsService.getStatus(req.params.transactionId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function listMyTransactions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await paymentsService.listForUser(req.user!.sub, req.query as never);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
